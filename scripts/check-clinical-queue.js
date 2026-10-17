async page => {
 await page.evaluate(() => sessionStorage.setItem('brightline:session', '1'));
 await page.goto('http://localhost:5173/home');
 await page.setViewportSize({width:1481,height:884});
 await page.locator('.clinical-case').first().waitFor();
 await page.screenshot({path:'artifacts/ui/clinical-queue-desktop.png'});
 const count=await page.locator('.clinical-case').count();
 await page.getByRole('link',{name:'Ver laudo: Pneumotórax hipertensivo',exact:true}).click();
 await page.waitForURL('**/caso/**');
 await page.goto('http://localhost:5173/home');
 await page.setViewportSize({width:390,height:844});
 await page.locator('.clinical-case').first().waitFor();
 await page.screenshot({path:'artifacts/ui/clinical-queue-mobile.png',fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 if(overflow) throw Error('Horizontal overflow');
 return {count,overflow,detailNavigation:true};
}
