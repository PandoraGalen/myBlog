var express = require('express'); //生成一个express实例 app
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');   //Node.js的HTTP请求日志中间件
var cookieParser = require('cookie-parser');    //解析cookie
var bodyParser = require('body-parser');  //node.js主体解析中间件，在req.body属性下可用
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var flash = require('connect-flash');
var multer  = require('multer');  //用于文件上传


var routes = require('./routes/index');
// var users = require('./routes/users');
var settings = require('./settings');

var app = express();

// view engine setup
//设置 views 文件夹为存放视图文件的目录, 即存放模板文件的地方,dirname 为全局变量,存储当前正在执行的脚本所在的目录。
app.set('views', path.join(__dirname, 'views'));
// 设置视图模板引擎为 ejs
app.set('view engine', 'ejs');


app.use(multer({
  dest: './public/images',
  rename: function (fieldname, filename) {
    return filename;
  }
}));

app.use(flash());
// app.use(favicon());
//设置/public/favicon.ico为favicon图标
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));    // 加载日志中间件
app.use(bodyParser.json());   // 加载解析json的中间件
// app.use(bodyParser.urlencoded());
app.use(bodyParser.urlencoded({ extended: false }));   //加载解析urlencoded请求体的中间件
app.use(cookieParser());    // 加载解析cookie的中间件
app.use(require('node-compass')({mode: 'expanded'}));     //这里我们使用compass来写样式表文件
app.use(express.static(path.join(__dirname, 'public')));  //设置public文件夹为存放静态文件的目录

app.use(session({
  secret: settings.cookieSecret,
  key: settings.db,  //cookie name
  cookie: {maxAge: 1000 * 60 * 60 * 24 * 30},//30 days
  store: new MongoStore({
    // db: settings.db,
    // host: settings.host,
    // port: settings.port
    url: 'mongodb://localhost/blog'
  })
}));

//路由控制器
/*
app.use('/', routes);  // 加载routes/index.js路由文件导出的路由实例
app.use('/users', users);
*/
// 总路由接口
routes( app );

// 捕获404错误，并转发到错误处理器
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// 开发环境下的错误处理器，将错误信息渲染error模版并显示到浏览器中
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// 生产环境下的错误处理器，将错误信息渲染error模版并显示到浏览器中
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// 导出app实例供其他模块调用
module.exports = app;
