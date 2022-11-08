const puppeteer = require('puppeteer');
const fs = require('fs');
const { setTimeout } = require('timers/promises');
const tabletojson = require('tabletojson').Tabletojson;
const cheerio = require('cheerio');

//line
const axios = require('axios');
const querystring = require('querystring');
const lineNotifyToken = JSON.parse(fs.readFileSync("./settings.json", "utf8")).sanbanseLineNotifyToken;

(async () => {
  while(true){
    const browser = await puppeteer.launch({
      args: ['--no-sandbox']//,
      //headless: false
    });
    try{
      const page = await browser.newPage();
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
    
      await (await page.$x(`//a[text() = "ふなばし三番瀬海浜公園"]`))[0].click();
      await page.waitForFunction(()=> document.readyState === "complete");  
      
      //今月分
      //月-金を削除
      await page.$$eval('th',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_mon"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_tue"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_wed"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_thu"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_fri"]',els => els.forEach(el => el.remove()));
      //await page.$$eval('td[class="m_akitablelist_sun"]',els => els.forEach(el => el.remove()));
      //await page.$$eval('td[class="m_akitablelist_sat"]',els => els.forEach(el => el.remove()));
      
      const tabledata = await page.evaluate(() => document.querySelector('table[class="m_akitablelist"]').outerHTML)
      const tabledata_json = tabletojson.convert(tabledata,{stripHtmlFromCells:false})
      tabledata_json[0].shift() //次の月ボタンがある行のデータ部削除
      // ハイフン表示の日分を削除
      tabledata_json[0].filter(item=>{
        if(item["0"] == "&nbsp;"){
          delete item["0"]
        }
        if(item["1"] == "&nbsp;"){
          delete item["1"]
        }
      })
      console.log("tabledata_json -> " + JSON.stringify(tabledata_json,null,2))
      // 空いてない日分を削除
      tabledata_json[0].filter(item=>{
        //一部空き
        //全て空き
        //予約あり
        if(!item["0"]?.match("一部空き") && !item["0"]?.match("全て空き")){
          delete item["0"]
        }
        if(!item["1"]?.match("一部空き") && !item["1"]?.match("全て空き")){
          delete item["1"]
        }
      })
      // delete によってできた空のオブジェクトを削除
      tabledata_json[0] = tabledata_json[0].filter(item => Object.keys(item).length !== 0)
      const year = await page.$eval('input[name="dispYY"]',el => el.value)
      const month = await page.$eval('input[name="dispMM"]',el => el.value)
      console.log("year -> " + year)
      console.log("month -> " + month)
      console.log("tabledata_json -> " + JSON.stringify(tabledata_json,null,2))

      // 日付,予約状況の配列作成
      availableList = []
      tabledata_json[0].forEach(item => {
        if(item["0"]){availableList.push(year + "/" + month + "/" + item["0"].replace(/.*([0-9]{2})日.*/,"$1"))}
        if(item["1"]){availableList.push(year + "/" + month + "/" + item["1"].replace(/.*([0-9]{2})日.*/,"$1"))}
      })
      console.log("availableList -> " + availableList)
      

      if(availableList.length){
        if(fs.existsSync("/tmp/sanbanse-court-previous.txt")){
          const previous = fs.readFileSync("/tmp/sanbanse-court-previous.txt","UTF-8")
          if(previous != JSON.stringify(availableList)){
            const myLine = new Line();
            myLine.setToken(lineNotifyToken);
            myLine.notify(JSON.stringify(availableList).toString());
            fs.writeFileSync("/tmp/sanbanse-court-previous.txt", JSON.stringify(availableList))
          }
	} else {
          const myLine = new Line();
          myLine.setToken(lineNotifyToken);
          myLine.notify(JSON.stringify(availableList).toString());
          fs.writeFileSync("/tmp/sanbanse-court-previous.txt", JSON.stringify(availableList))
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
