async page => {
  await page.goto('http://localhost:5173/app');
  await page.setViewportSize({width: 1440, height: 1000});
  await page.getByRole('button', { name: 'Nódulo pulmonar suspeito', exact: true }).waitFor();
  await page.screenshot({path:'artifacts/ui/saas-desktop.png', fullPage:true});
}
