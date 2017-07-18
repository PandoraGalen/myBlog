var crypto = require('crypto'),
    User = require('../models/user.js'),
    Post = require('../models/post.js'),
    Comment = require('../models/comment.js');

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
module.exports = function(app) {
    // get请求，获取系统首页
    app.get('/', function(req, res) {
        //判断是否是第一页，并把请求的页数转换成 number 类型
        var page = req.query.p ? parseInt(req.query.p) : 1;
        //查询并返回第 page 页的 10 篇文章
        Post.getTen(null, page, function(err, posts, total) {
            if (err) {
                posts = [];
            }
            res.render('index', {
                title: '主页',
                posts: posts,
                page: page,
                total: Math.ceil(total / 10),
                isFirstPage: (page - 1) == 0,
                isLastPage: ((page - 1) * 10 + posts.length) == total,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    // ------------------------------------------------------------ 登录
    // get请求，获取登录页面
    app.get('/login', checkNotLogin);  // 检查用户是否未登录，如果是，才继续执行下面代码
    app.get('/login', function(req, res) {
        res.render('login', {  // 渲染登录页面，下面是登录模板中能用到的变量
            title: '登录',
            user: req.session.user,  //session中存储的当前用户
            success: req.flash('success').toString(),  //成功的页面通知信息
            error: req.flash('error').toString()   //失败的页面通知信息
        });
    });
    // post请求，提交登录操作
    app.post('/login', checkNotLogin);
    app.post('/login', function(req, res) {
        //生成密码的 md5 值
        var md5 = crypto.createHash('md5'),  //实例化md5,用户密码加密
            password = md5.update(req.body.password).digest('hex'); //对密码加密
        //检查用户是否存在
        User.get(req.body.name, function(err, user) {
            if (!user) {  // 如果用户不存在
                req.flash('error', '用户不存在!');   //页面通知，提示用户“用户不存在”
                return res.redirect('/login'); //用户不存在则跳转到登录页
            }
            //检查密码是否一致
            if (user.password != password) {    // 如果数据库中存储的用户密码和当前用户输入的不一致
                req.flash('error', '密码错误!'); // 页面通知用户，提示密码错误
                return res.redirect('/login'); //密码错误则跳转到登录页
            }
            //用户名密码都匹配后，将用户信息存入 session
            req.session.user = user;
            req.flash('success', '登陆成功!');
            res.redirect('/'); //登陆成功后跳转到主页
        });
    });

    // ------------------------------------------------------------ 注册
    // get请求，获取注册页面
    app.get('/reg', checkNotLogin);
    app.get('/reg', function(req, res) {
        res.render('reg', {  // 渲染注册页面
            title: '注册',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    })
    // post请求，提交注册
    app.post('/reg', checkNotLogin);
    app.post('/reg', function(req, res) {
        var name = req.body.name,    // 用户注册时输入的用户名
            password = req.body.password;  // 用户注册时输入的登录密码
            // password_re = req.body['confirm_password'];
        //检验用户两次输入的密码是否一致
        // if (password_re != password) {
        //     req.flash('error', '两次输入的密码不一致!');
        //     return res.redirect('/reg'); //返回注册页
        // }
        //生成密码的 md5 值
        var md5 = crypto.createHash('md5'),  //实例化md5
            password = md5.update(req.body.password).digest('hex');  //对密码加密
        var newUser = new User({   //实例化一个新用户对象
            name: name,  // 用户名
            password: password,  //密码
            email: req.body.email  // 邮箱
        });
        //检查用户名是否已经存在
        User.get(newUser.name, function(err, user) {
            if (err) {  // 如果出错
                req.flash('error', err);    //页面通知用户，提示出粗
                return res.redirect('/');  // 跳转到首页
            }
            if (user) { // 如果用户已经存在
                req.flash('error', '用户已存在!');  // 通知用户用户已经存在
                return res.redirect('/reg'); //返回注册页
            }
            //如果不存在则新增用户
            newUser.save(function(err, user) {
                if (err) {  //到这里，如果向数据库存储出错
                    req.flash('error', err);  // 通知用户发生错误
                    return res.redirect('/reg'); //注册失败返回主册页
                }
                req.session.user = user; //用户信息存入 session
                req.flash('success', '注册成功!');
                res.redirect('/'); //注册成功后返回主页
            });
        });
    });

    // ----------------------------------------------------------- 创建文章
    // get请求，获取创建文章页面
    app.get('/post', checkLogin);
    app.get('/post', function(req, res) {
        res.render('post', {
            title: '发表文章',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    })
    // post请求，发布文章
    app.post('/post', checkLogin);
    app.post('/post', function(req, res) {
        var currentUser = req.session.user,
            tags = [req.body.tag1, req.body.tag2, req.body.tag3],
            post = new Post(currentUser.name, req.body.title, tags, req.body.post);

        post.save(function(err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            req.flash('success', '发布成功!');
            res.redirect('/'); //发表成功跳转到主页
        });
    });


    // ---------------------------------------------------------- 退出
    // get请求，退出
    app.get('/logout', checkLogin);
    app.get('/logout', function(req, res) {
        req.session.user = null;
        req.flash('success', '登出成功!');
        res.redirect('/'); //登出成功后跳转到主页
    });

    // get请求，上传文件页面
    app.get('/upload', checkLogin);
    app.get('/upload', function(req, res) {
        res.render('upload', {
            title: '文件上传',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    // post请求，上传文件
    app.post('/upload', checkLogin);
    app.post('/upload', function(req, res) {
        req.flash('success', '文件上传成功!');
        res.redirect('/upload');
    });

    // get请求，获取文档页面
    app.get('/archive', function(req, res) {
        Post.getArchive(function(err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('archive', {
                title: '存档',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    // get请求，获取标签页面
    app.get('/tags', function(req, res) {
        Post.getTags(function(err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tags', {
                title: '标签',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/tags/:tag', function(req, res) {
        Post.getTag(req.params.tag, function(err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tag', {
                title: 'TAG:' + req.params.tag,
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    // get请求，模糊搜索，通过关键字搜索文章
    app.get('/search', function(req, res) {
        Post.search(req.query.keyword, function(err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('search', {
                title: "SEARCH:" + req.query.keyword,
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    // u  评论
    app.get('/u/:name', function(req, res) {
        var page = req.query.p ? parseInt(req.query.p) : 1;
        //检查用户是否存在
        User.get(req.params.name, function(err, user) {
            if (!user) {
                req.flash('error', '用户不存在!');
                return res.redirect('/');
            }
            //查询并返回该用户第 page 页的 10 篇文章
            Post.getTen(user.name, page, function(err, posts, total) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/');
                }
                res.render('user', {
                    title: user.name,
                    posts: posts,
                    page: page,
                    total: Math.ceil(total / 10),
                    isFirstPage: (page - 1) == 0,
                    isLastPage: ((page - 1) * 10 + posts.length) == total,
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            });
        });
    });
    app.get('/u/:name/:day/:title', function(req, res) {
        Post.getOne(req.params.name, req.params.day, req.params.title, function(err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('article', {
                title: req.params.title,
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.post('/u/:name/:day/:title', function(req, res) {
        var date = new Date(),
            time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
        var comment = {
            name: req.body.name,
            email: req.body.email,
            website: req.body.website,
            time: time,
            content: req.body.content
        };
        var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
        newComment.save(function(err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '留言成功!');
            res.redirect('back');
        });
    });

    // get请求，获取需要编辑更新的文章
    app.get('/edit/:name/:day/:title', checkLogin);
    app.get('/edit/:name/:day/:title', function(req, res) {
        var currentUser = req.session.user;
        Post.edit(currentUser.name, req.params.day, req.params.title, function(err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            res.render('edit', {
                title: '编辑',
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    // post，提交更新文章
    app.post('/edit/:name/:day/:title', checkLogin);
    app.post('/edit/:name/:day/:title', function(req, res) {
        var currentUser = req.session.user;
        Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function(err) {
            var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
            if (err) {
                req.flash('error', err);
                return res.redirect(url); //出错！返回文章页
            }
            req.flash('success', '修改成功!');
            res.redirect(url); //成功！返回文章页
        });
    });

    // get请求，删除文章
    app.get('/remove/:name/:day/:title', checkLogin);
    app.get('/remove/:name/:day/:title', function(req, res) {
        var currentUser = req.session.user;
        Post.remove(currentUser.name, req.params.day, req.params.title, function(err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '删除成功!');
            res.redirect('/');
        });
    });

    // 404页面
    app.use(function (req, res) {
      res.render("404");
    });

    /*
    * 检查用户已经登录
    * 如果是，继续下面的操作；
    * 如果不是（也就是还没有登录），就页面通知用户“未登录”，并且页面跳转到登录页面让用户登录；
    * */
    function checkLogin(req, res, next) {
        if (!req.session.user) {
            req.flash('error', '未登录!');
            res.redirect('/login');
        }
        next();
    }

    /*
    * 检查用户未登录
    * 如果是，继续下面的操作；
    * 如果不是（也就是已经登录了），页面通知提示用户已经登录，并且返回到之前的页面；
    * */
    function checkNotLogin(req, res, next) {
        if (req.session.user) {
            req.flash('error', '已登录!');
            res.redirect('back');
        }
        next();
    }

};
