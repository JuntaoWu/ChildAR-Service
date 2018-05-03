var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var UglifyJS = require('uglify-js');
var doCompressJS = false;
var isStopWebSite = false;

var router = express.Router(); 
var app = express();

app.listen(8081);

app.use(express.query());
app.use(bodyParser.json({limit: '50mb'})); 
app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));

app.get('/', function (req, res) {
	res.send('helloworld');
})

//处理静态文件
router.get(/[^\#\?]\.(css|jpg|jpeg|gif|png|ttf|js|icon|txt|json|xls|xlsx)$/i, function(req, res) {
	
	var str= "";
	var options = {
		root: __dirname + '/public/',
		dotfiles: 'deny'
	};
	
	var matchArr = (req.url + "").match(/[^\#\?]\.(css|jpg|jpeg|gif|png|ttf|js|icon|txt|json|xls|xlsx)$/i);
	if(matchArr && matchArr.length){
		var ext = matchArr[1];
	}
	else{
		res.status(404).end("<h1>404 ERROR, File Not Found!</h1>");
		return;
	}
	//var ext = (req.url + "").match(/[^\#\?]\.(css|jpg|gif|png|ttf|js|icon|txt|json)$/i)[1];
	var loc =  __dirname + '/public/' + decodeURI(req.url);
	
	//压缩混淆js，并缓存
	if(doCompressJS && ext.toLowerCase() == "js" && !(req.url + "").match(/min\.js$/i)){
		
		var reqETag = req.headers["if-none-match"];
		if(reqETag && jsContentHash[req.url] && jsContentHash[req.url].ETag && reqETag == jsContentHash[req.url].ETag){
			res.status(304).end("");
			return;
		} 
		else if(jsContentHash[req.url]){
			res.type("application/javascript").set("ETag",jsContentHash[req.url].ETag).send(jsContentHash[req.url].code);
		}
		else{
			
			fs.readFile(loc, function (err, data) {
				if(err){
					res.status(400).end("<h1>404 ERROR, File Not Foundf!</h1>");
				}
				else{
					console.time("!!compress JS "+req.url+", time used:");
					var compressJS = UglifyJS.minify(data+"", {fromString: true});
					console.timeEnd("!!compress JS "+req.url+", time used:");
					var etagStr = Math.floor(Math.random()*100000)+"_"+Math.floor(Math.random()*100000)+"_"+Math.floor(Math.random()*100000)
					jsContentHash[req.url] = {code:compressJS.code, ETag: etagStr};
					res.type("application/javascript").set("ETag",etagStr).send(compressJS.code);
				}
			});
		}
		
	}
	else{
		
		var sendFileLoc = decodeURI(req.url);
		res.sendFile(sendFileLoc, options,  function (err) {
				if (err) {
					if(err.status == "404"){
						res.status(err.status).end("<h1>404 ERROR, File Not Found!</h1>");
						return;
					}
					else if(err.status == "500"){
						res.status(err.status).end("<h1>500 ERROR, Server Error!</h1>");
						return;
					}
					res.status(err.status).end();
				}
				else {
				}
			}
		)
	}
	
});

//由于html可以通过?传递参数，所以进行单独处理
router.get(/([^\#\?]\.html|[^\#\?]\.html[\?][\d\D]*)$/i, function(req, res) {
	if(isStopWebSite){
		res.send("<h1>正在维护中,请稍后再试。</h1>");
		return;
	}
	var str= "";
	
	var options = {
		root: __dirname + '/public/',
		dotfiles: 'deny'
	};
	var location_str = req.url.replace(/\?[\d\D]*$/,"");
	res.sendFile(location_str, options,  function (err) {
			if (err) {
				if(err.status == "404"){
					res.status(err.status).end("<h1>404 ERROR, File Not Found!</h1>");
					return;
				}
				else if(err.status == "500"){
					res.status(err.status).end("<h1>500 ERROR, Server Error!</h1>");
					return;
				}
				res.status(err.status).end();
			}
			else {
			}
		}
	)
});

var api_app = require('./api/api_app.js');
var interfacePostAndGetProc = function(req, res){
	var matrrr = req.url.match(/^\/api\/([^\?]+)/);
	var jsonpCallBack = "";
	if(req.url.match(/callback\=([^\&]+)/)){
		jsonpCallBack = req.url.match(/callback\=([^\&]+)/)[1];
	}
	var interfaceName = matrrr[1];
	var resObj = {
		res:res,
		send:function(obj){
			var returnObj = {msg:"", status:true, data:obj};
			if(jsonpCallBack){
				this.res.send(jsonpCallBack+"("+JSON.stringify(returnObj)+")");
			}
			else{
				this.res.send(returnObj);
			}
			
			return this.res;
		},
		sendErr:function(msg,type){
			var returnObj = {msg:msg, status:false, type:!type?"":type};
			if(jsonpCallBack){
				this.res.send(jsonpCallBack+"("+JSON.stringify(returnObj)+")");
			}
			else{
				this.res.send(returnObj);
			}
			this.res.end();
		}
	}
	////开始判断来源domain是否符合规定
	var referer = req.get("Referer");
	var allowDomain = "";
	//console.log(referer);
	if(referer ){
		var matchResult = referer.match(/http:\/\/([^\/]+)/);
		if(matchResult){
			referer = matchResult[1];
			if(referer == "localhost:8081"){
				allowDomain = referer;
			}
		}
	}
	//如果用get方式传入了参数，把get的参数填入req.body中，以确保和post的参数在一个位置
	if(req.url.match(/\?([\d\D]+)/)){
		var paramStr = req.url.match(/\?([\d\D]+)/)[1];
		//console.log(paramStr);
		if(!req.body){
			req.body = {};
		}
		var strs = paramStr.split("&");
		for(var i = 0; i < strs.length; i++) {
			if(!req.body[strs[i].split("=")[0]]){
				req.body[strs[i].split("=")[0]] = strs[i].split("=")[1];
			}
		}
		//console.log(req.body)
	}
	
	
	if(allowDomain){
		res.header("Access-Control-Allow-Origin", "http://" + allowDomain);
	}
	
	if((typeof api_app[interfaceName])+"" == "function"){
		api_app[interfaceName](req, resObj);
	}
	else{
		resObj.sendErr(" 没有找到对应的api。");
	}
}

router.get(/^\/api\/[\d\D]+$/i, interfacePostAndGetProc);
router.post(/^\/api\/[\d\D]+$/i, interfacePostAndGetProc);

app.use("/",router)

