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
      
      //月-金を削除
      await page.$$eval('td[class="m_akitablelist_mon"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_tue"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_wed"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_thu"]',els => els.forEach(el => el.remove()));
      await page.$$eval('td[class="m_akitablelist_fri"]',els => els.forEach(el => el.remove()));
      //await page.$$eval('td[class="m_akitablelist_sun"]',els => els.forEach(el => el.remove()));
      //await page.$$eval('td[class="m_akitablelist_sat"]',els => els.forEach(el => el.remove()));
      
      //aki syutoku syori
      var akiarray = await akisyutoku(page)
    
      await page.click('img[alt="次の月"]');
      await page.waitForFunction(()=> document.readyState === "complete");  
      //aki syutoku syori
      akiarray = akiarray.concat(await akisyutoku(page));
      if(akiarray.length){
        if(fs.existsSync("/tmp/sanbanse-court-previous.txt")){
          const previous = fs.readFileSync("/tmp/sanbanse-court-previous.txt","UTF-8")
          if(previous != JSON.stringify(akiarray)){
            const myLine = new Line();
            myLine.setToken(lineNotifyToken);
            myLine.notify(JSON.stringify(akiarray).toString());
            fs.writeFileSync("/tmp/sanbanse-court-previous.txt", JSON.stringify(akiarray))
          }
	} else {
          const myLine = new Line();
          myLine.setToken(lineNotifyToken);
          myLine.notify(JSON.stringify(akiarray).toString());
          fs.writeFileSync("/tmp/sanbanse-court-previous.txt", JSON.stringify(akiarray))
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

const akisyutoku = async function(page){
  //aki syutoku syori
  const tabledata = await page.evaluate(() => document.querySelector('table[class="m_akitablelist"]').outerHTML)
  const tabledata_json = tabletojson.convert(tabledata,{stripHtmlFromCells:false})
  const yearmonth = cheerio.load(tabledata_json[0][0]["日曜日"]).text()
  console.log(yearmonth)
  tabledata_json[0].shift();
  console.log("nengetu syutoku -------------")
  const data = tabledata_json[0].filter(item=>!!item).filter((item)=>{
    delete item["月曜日"]
    delete item["火曜日"]
    delete item["水曜日"]
    delete item["木曜日"]
    delete item["金曜日"]
    return item
  })
  console.log("doniti igai sakujo -------------")
  data.filter(item=>{
    if(item["土曜日"] == "&nbsp;"){
      delete item["土曜日"]
    }
    if(item["日曜日"] == "&nbsp;"){
      delete item["日曜日"]
    }
  })
  console.log(data)
  const akilist = [];
  console.log("hiduke nasi sakujo -------------")
  data.forEach(item=>{
    //一部空き
    //全て空き
    //予約あり
    //if(item["日曜日"]?.toString().match(/.*予約あり.*/)){
    //  akilist.push(item["日曜日"])
    //}
    //if(item["土曜日"]?.toString().match(/.*予約あり.*/)){
    //  akilist.push(item["土曜日"])
    //}
    if(item["日曜日"]?.toString().match(/.*一部空き.*/)){
      akilist.push(item["日曜日"])
    }
    if(item["土曜日"]?.toString().match(/.*一部空き.*/)){
      akilist.push(item["土曜日"])
    }
  })
  console.log("akinomi syutoku -------------")
  var akihidukelist = [];
  akilist.forEach(item=>{
    console.log("item->" + item)
    console.log("hiduke syutoku -------------")
    akihidukelist.push(yearmonth +  cheerio.load(item).text())
  })
  
  return akihidukelist
}

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
