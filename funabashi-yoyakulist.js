//crontabに以下の様に追記して定期通知
/*
@reboot root	bash -c "cd /home/noma/funabashi-tenniscourt-checker;node ./funabashi-yoyakulist.js" | tee /tmp/crontablog
*/

const puppeteer = require('puppeteer');
const fs = require('fs');
const { setTimeout } = require('timers/promises');

//line
const axios = require('axios');
const querystring = require('querystring');
const lineNotifyToken = JSON.parse(fs.readFileSync("./settings.json", "utf8")).lineNotifyToken;
const kakoyoyakuList = [];

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

      await page.click('img[src="image/bw_login.gif"]');
      await page.waitForFunction(()=> document.readyState === "complete");  
    
      await page.click('img[alt="予約の確認"]');
      await page.waitForFunction(()=> document.readyState === "complete");  
      
      //table ヘッダー行削除
      await page.$eval('tr',el => el.remove());
      await page.$eval('tr',el => el.remove());
      await page.$eval('tr',el => el.remove());
      await page.$eval('tr',el => el.remove());

      //日時取得
      const myLine = new Line();
      yoyakulist = []
      yoyakucount = ((await page.$x(`//td`)).length) / 10
      console.log("yoyakucount -> " + yoyakucount)
      for(let i = 1;i <= yoyakucount;i++){
        date = (await (await page.$x(`//td`))[1].getProperty('innerText')).toString().replace(/JSHandle:(.*)/g,"$1").replace('\n',' ')
        jikan = (await (await page.$x(`//td`))[2].getProperty('innerText')).toString().replace(/JSHandle:(.*)/g,"$1") 
        courtname = (await (await page.$x(`//td`))[3].getProperty('innerText')).toString().replace(/JSHandle:(.*)/g,"$1") 
        courtnumber = (await (await page.$x(`//td`))[4].getProperty('innerText')).toString().replace(/JSHandle:(.*)/g,"$1") 
        console.log("date -> " + date)
        console.log("jikan -> " + jikan)
        console.log("courtname -> " + courtname)
        console.log("courtnumber -> " + courtnumber)
        yoyakulist.push({"日付": date, "時間": jikan, "コート名": courtname, "コート番号": courtnumber})
        await page.$eval('tr',el => el.remove());
      }
      console.log(yoyakulist)
      myLine.setToken(lineNotifyToken);
      message = "船橋の予約状況" + "\n"
      yoyakulist.forEach(yoyaku => message = message + "- "+ yoyaku["日付"] + " " + yoyaku["時間"] + " " + yoyaku["コート名"] + " " + yoyaku["コート番号"] + "\n")
      message = message + "利用者番号:" + JSON.parse(fs.readFileSync("./settings.json", "utf8")).userid + "\n"
      message = message + "パスワード:" + JSON.parse(fs.readFileSync("./settings.json", "utf8")).password + "\n"
      message = message + "url:" + "https://funayoyaku.city.funabashi.chiba.jp/web"
      myLine.notify(message);
    
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
