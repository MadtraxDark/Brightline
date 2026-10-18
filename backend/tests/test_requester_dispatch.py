import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4
from app.main import requester_dispatch_state, send_requester
from fastapi import HTTPException

class DispatchClockTests(unittest.TestCase):
    def test_pending_keeps_counting_and_sent_freezes(self):
        now=datetime.now(timezone.utc)
        case={"deadline_at_sim":1,"closed_at":now-timedelta(minutes=30),"requester_sent_at":None}
        self.assertAlmostEqual(requester_dispatch_state(case,0,now)["requester_dispatch_remaining_hours"],.5)
        self.assertLess(requester_dispatch_state(case,0,now+timedelta(minutes=20))["requester_dispatch_remaining_hours"],.5)
        case.update(requester_sent_at=now,requester_sent_at_sim=0)
        self.assertAlmostEqual(requester_dispatch_state(case,5,now+timedelta(days=2))["requester_dispatch_remaining_hours"],.5)
        self.assertIsNone(requester_dispatch_state(case,5)["requester_dispatch_deadline"])

class DispatchEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def test_duplicate_is_idempotent(self):
        conn=MagicMock();conn.execute.return_value.fetchone.return_value={"institution_id":"test","status":"closed","requester_sent_at":datetime.now(timezone.utc)}
        with patch('app.main.db') as db, patch('app.main.active_institution',return_value='test'):
            db.return_value.__enter__.return_value=conn
            result=await send_requester(uuid4(),{"user":{"id":str(uuid4()),"institutions":["test"]}})
        self.assertTrue(result['already_registered'])
        self.assertEqual(conn.execute.call_count,1)
    async def test_open_case_cannot_be_sent(self):
        conn=MagicMock();conn.execute.return_value.fetchone.return_value={"institution_id":"test","status":"read"}
        with patch('app.main.db') as db, patch('app.main.active_institution',return_value='test'):
            db.return_value.__enter__.return_value=conn
            with self.assertRaises(HTTPException) as error:
                await send_requester(uuid4(),{"user":{"id":str(uuid4()),"institutions":["test"]}})
        self.assertEqual(error.exception.status_code,409)

    async def test_uses_linked_institutions_instead_of_only_active(self):
        conn=MagicMock();conn.execute.return_value.fetchone.return_value={"institution_id":"linked","status":"closed","requester_sent_at":datetime.now(timezone.utc)}
        with patch('app.main.db') as db, patch('app.main.active_institution',return_value='active'):
            db.return_value.__enter__.return_value=conn
            await send_requester(uuid4(),{"user":{"id":str(uuid4()),"institutions":["active","linked"]}})
        sql,args=conn.execute.call_args.args
        self.assertIn("institution_id=ANY",sql)
        self.assertEqual(args[1],["active","linked"])
    async def test_unlinked_case_is_not_found(self):
        conn=MagicMock();conn.execute.return_value.fetchone.return_value=None
        with patch('app.main.db') as db, patch('app.main.active_institution',return_value='active'):
            db.return_value.__enter__.return_value=conn
            with self.assertRaises(HTTPException) as error:
                await send_requester(uuid4(),{"user":{"id":str(uuid4()),"institutions":["active"]}})
        self.assertEqual(error.exception.status_code,404)
