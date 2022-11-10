const puppeteer = require('puppeteer');
const fs = require('fs');
const { setTimeout } = require('timers/promises');
const tabletojson = require('tabletojson').Tabletojson;
const cheerio = require('cheerio');

//line
const axios = require('axios');
const querystring = require('querystring');
const lineNotifyToken = JSON.parse(fs.readFileSync("./settings.json", "utf8")).natsumiLineNotifyToken;

(async () => {
  while(true){
    const browser = await puppeteer.launch({
      args: ['--no-sandbox']//,
      //headless: false
    });
    try{
      const page = await browser.newPage();
      page.on('dialog',async dialog => {
        dialog.accept();
      })
      await page.goto('https://funayoyaku.city.funabashi.chiba.jp/web/index.jsp');
      await page.waitForFunction(()=> document.readyState === "complete");  
    
      await page.type('input[id="userId"]',JSON.parse(fs.readFileSync("./settings.json", "utf8")).userid);
      await page.waitForFunction(()=> document.readyState === "complete");  
    
      await page.type('input[id="password"]',JSON.parse(fs.readFileSync("./settings.json", "utf8")).password);
      await page.waitForFunction(()=> document.readyState === "complete");  
    
      await page.screenshot({path: 'example.png'});
      await page.waitForFunction(()=> document.readyState === "complete");  
    
      await page.click('img[src="image/bw_login.gif"]');
      await page.waitForFunction(()=> document.readyState === "complete");  
    
      await page.click('img[src="image/bw_rsvapply.gif"]');
      await page.waitForFunction(()=> document.readyState === "complete");  
    
      await page.click('img[src="image/bw_fromusepurpose.gif"]');
      await page.waitForFunction(()=> document.readyState === "complete");  
    
      await (await page.$x(`//a[text() = "テニス"]`))[0].click();
      await page.waitForFunction(()=> document.readyState === "complete");  
    
      await (await page.$x(`//a[text() = "運動公園"]`))[0].click();
      await page.waitForFunction(()=> document.readyState === "complete");  
      
      //今月分
      //月-金を削除
      await page.$$eval('th',els => els.forEach(el => el.remove()));
      await page.$$eval('table[class="tcontent"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_mon"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_tue"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_wed"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_thu"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_fri"]',els => els.forEach(el => el.remove()));
      //await page.$$eval('td[class="m_akitablelist_sun"]',els => els.forEach(el => el.remove()));
      //await page.$$eval('td[class="m_akitablelist_sat"]',els => els.forEach(el => el.remove()));
      const myLine = new Line();

      //空きがあればそのまま予約
      if (await page.$('img[src="image/bw_cal100.gif"]') !== null){
        await page.click('img[src="image/bw_cal100.gif"]');
        await page.waitForFunction(()=> document.readyState === "complete");  
        await page.click('img[alt="空き"]');
        await page.waitForFunction(()=> document.readyState === "complete");  
        await page.click('img[src="image/bw_watch.gif"]');
        await page.waitForFunction(()=> document.readyState === "complete");  
        await page.click('img[alt="申込み"]');
        await page.waitForFunction(()=> document.readyState === "complete");  
        await page.click('input[value="1"]');
        await page.waitForFunction(()=> document.readyState === "complete");  
        await page.click('img[alt="確認"]');
        await page.waitForFunction(()=> document.readyState === "complete");  
        akidate = (await (await page.$x(`//td[contains(text(),'年')]`))[0].getProperty('innerText')).toString().split(/\r\n|\r|\n/)[0].replace(/.*([0-9]{4}年.*日).*/g,"$1").replace(/[年|月]/g,"/").replace("日","")
        akijikan = (await (await page.$x(`//td[contains(text(),'0分')]`))[0].getProperty('innerText')).toString().replace(/JSHandle:(.*分$)/g,"$1")
        console.log("akijikan -> " + akijikan)
        console.log("akidate -> " + akidate)
        //選択している日にち - 現在の日にちの日数差分
        dayPeriod = Math.floor((new Date(akidate) - new Date()) / (1000 * 60 * 60 * 24))
        //空き予定との間隔が4以上なら予約を進める
        if(dayPeriod >= 4){
          await page.type('input[name="applyNum"]',"4");
          await page.click('img[alt="申込み"]');
          await page.waitForFunction(()=> document.readyState === "complete");  
          myLine.setToken(lineNotifyToken);
          myLine.notify("夏見台運動公園 " + akidate + "の" + akijikan + "取りました。\n" + "利用者番号:" + JSON.parse(fs.readFileSync("./settings.json", "utf8")).userid + "\n" + "パスワード:" + JSON.parse(fs.readFileSync("./settings.json", "utf8")).password);
        }
        else {
          console.log(akidate + " " + akijikan +"が空いてましたが4日の期間がなかったため予約しませんでした。")
        }
      } else {
        //来月分
        await page.click('img[alt="次の月"]');
        await page.waitForFunction(()=> document.readyState === "complete");  
        //月-金を削除
        await page.$$eval('th',els => els.forEach(el => el.remove()));
        await page.$$eval('table[class="tcontent"]',els => els.forEach(el => el.remove()));
        await page.$$eval('td[class="m_akitablelist_mon"]',els => els.forEach(el => el.remove()));
        await page.$$eval('td[class="m_akitablelist_tue"]',els => els.forEach(el => el.remove()));
        await page.$$eval('td[class="m_akitablelist_wed"]',els => els.forEach(el => el.remove()));
        await page.$$eval('td[class="m_akitablelist_thu"]',els => els.forEach(el => el.remove()));
        await page.$$eval('td[class="m_akitablelist_fri"]',els => els.forEach(el => el.remove()));
        //await page.$$eval('td[class="m_akitablelist_sun"]',els => els.forEach(el => el.remove()));
        //await page.$$eval('td[class="m_akitablelist_sat"]',els => els.forEach(el => el.remove()));
        year = await page.$eval('input[name="dispYY"]',el => el.value)
        month = await page.$eval('input[name="dispMM"]',el => el.value)
  
        //空きがあればそのまま予約
        if (await page.$('img[src="image/bw_cal100.gif"]') !== null){
          await page.click('img[src="image/bw_cal100.gif"]');
          await page.waitForFunction(()=> document.readyState === "complete");  
          await page.click('img[alt="空き"]');
          await page.waitForFunction(()=> document.readyState === "complete");  
          await page.click('img[src="image/bw_watch.gif"]');
          await page.waitForFunction(()=> document.readyState === "complete");  
          await page.click('img[alt="申込み"]');
          await page.waitForFunction(()=> document.readyState === "complete");  
          await page.click('input[value="1"]');
          await page.waitForFunction(()=> document.readyState === "complete");  
          await page.click('img[alt="確認"]');
          await page.waitForFunction(()=> document.readyState === "complete");  
          akidate = (await (await page.$x(`//td[contains(text(),'年')]`))[0].getProperty('innerText')).toString().split(/\r\n|\r|\n/)[0].replace(/.*([0-9]{4}年.*日).*/g,"$1").replace(/[年|月]/g,"/").replace("日","")
          akijikan = (await (await page.$x(`//td[contains(text(),'0分')]`))[0].getProperty('innerText')).toString().replace(/JSHandle:(.*分$)/g,"$1")
          console.log("akijikan -> " + akijikan)
          console.log("akidate -> " + akidate)
          //選択している日にち - 現在の日にちの日数差分
          dayPeriod = Math.floor((new Date(akidate) - new Date()) / (1000 * 60 * 60 * 24))
          //空き予定との間隔が4以上なら予約を進める
          if(dayPeriod >= 4){
            await page.type('input[name="applyNum"]',4);
            await page.click('img[alt="申込み"]');
            await page.waitForFunction(()=> document.readyState === "complete");  
            const myLine = new Line();
            myLine.setToken(lineNotifyToken);
            myLine.notify("三番瀬 " + akidate + "の" + akijikan + "取りました。\n" + "利用者番号:" + JSON.parse(fs.readFileSync("./settings.json", "utf8")).userid + "\n" + "パスワード:" + JSON.parse(fs.readFileSync("./settings.json", "utf8")).password);
          }
          else {
            console.log(akidate + " " + akijikan +"が空いてましたが4日の期間がなかったため予約しませんでした。")
          }
        }
      }

      await browser.close();
      await setTimeout(60000);
    } catch(error) {
      console.log("catched" + error)
      console.error(error)
      await browser.close();
    }
  }
})();

const Line = function () {};

/**
 * LINE Notifyのトークンセット
 * @param {String} token LINE Notifyトークン
 */
Line.prototype.setToken = function(token) {
  this.token = token;
}

/**
 * LINE Notify実行
 * @param {String} text メッセージ
 */
Line.prototype.notify = function(text) {
  if(this.token == undefined || this.token == null){
    console.error('undefined token.');
    return;
  }
  console.log(`notify message : ${text}`);
  axios(
    {
      method: 'post',
      url: 'https://notify-api.line.me/api/notify',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: querystring.stringify({
        message: text,
      }),
    }
  )
  .then( function(res) {
    console.log(res.data);
  })
  .catch( function(err) {
    console.error(err);
  });
};
