// load the things we need
const express = require('express');
const app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

// use res.render to load up an ejs view file

// home page
app.get("/", function(req, res) {
    // const sql = "select * from nodejs";
    // connection.query(sql, function(err, result, fields) {
    //     if (err) throw err;
    //     console.log(result);
    // });
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

app.listen(8080);
console.log('8080 port');
