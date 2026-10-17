export function formatRemaining(hours) {
  const negative = hours < 0;
  const totalMinutes = Math.round(Math.abs(hours) * 60);
  let text;
  if (totalMinutes >= 48 * 60) {
    const days = Math.floor(totalMinutes / (24 * 60));
    const restHours = Math.floor((totalMinutes % (24 * 60)) / 60);
    text = `${days}d ${restHours}h`;
  } else if (totalMinutes >= 60) {
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    text = `${wholeHours}h ${minutes}m`;
  } else {
    text = `${totalMinutes} min`;
  }
  if (!negative) return text;
  if (text.endsWith(" 0m")) text = text.slice(0, -3);
  return `Atrasado há ${text}`;
}
