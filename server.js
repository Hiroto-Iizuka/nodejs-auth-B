// load the things we need
const express = require('express');
const app = express();
const port = 8080;

const mysql=require('mysql');

//接続情報をcreateConnectionメソッドを用いて定数connectionに代入
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "nodejs_auth_b_db",
});

connection.connect(function(err) {
    if (err) throw err;
    console.log('Connected');
    // 以下はdb作成スクリプトなので初回のみ実行
    // connection.query('CREATE DATABASE nodejs_auth_b_db', function(err, result) {
    //     if (err) throw err;
    //     console.log('database created');
    // });
    // 以下はtable作成スクリプトなので初回のみ実行
    // const sql = 'CREATE TABLE users (id INT NOT NULL PRIMARY KEY AUTO_INCREMENT, userName VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL)';
    // connection.query(sql, function(err, result) {
    //     if (err) throw err;
    //     console.log('table created');
    // });
    const sql = 'CREATE TABLE IF NOT EXISTS users (id INT NOT NULL PRIMARY KEY AUTO_INCREMENT, userName VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL)';
    connection.query(sql, function(err, result) {
        if (err) throw err;
        console.log('table created');
    });
});

// set the view engine to ejs
app.set('view engine', 'ejs');

// use res.render to load up an ejs view file

// home page
app.get("/", function(req, res) {
    res.render('pages/index');
})

// login page
app.get('/login', function(req, res) {
    res.render('pages/login');
});

// register page
app.get('/register', function(req, res) {
    res.render('pages/register');
});

app.post('/register', function(req, res) {
    connection.query('select * from users;', function(err, users) {
        connection.query('insert into users set ? ', {
            userName: req.body.userName,
            email: req.body.email,
            password: req.body.password,
        }),
        function(err) {
            console.log("ユーザー登録に関するエラー:" + err);
            res.redirect("/");
        }
    });
});

app.listen(port);
console.log('8080 port');
