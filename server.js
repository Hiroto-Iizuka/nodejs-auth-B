require('dotenv').config();

// load the things we need
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const router = express.Router()
const { check, validationResult } = require('express-validator');
const mysql = require('mysql');
const jwt = require("jsonwebtoken");

const con = mysql.createConnection({
    host: process.env.HOSTNAME,
    user: process.env.USERNAME,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
});

con.connect(function(err) {
    if (err) throw err;
    console.log('MySQL Connected');
});

// 直でURLを叩いた時にはログインページへリダイレクト
const isLoggedIn = (req, res, next) => {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        'SECRETKEY'
      );
      console.log(req.userData)
      req.userData = decoded;
      next();
    } catch (err) {
      res.redirect('/login');
    }
}
  
app.use(bodyParser.urlencoded({ extended: true }));

// set the view engine to ejs
app.set('view engine', 'ejs');

// login page
app.get('/login', function(req, res) {
    res.render('pages/login');
});
app.post('/login', (req, res, next) => {
    const sql = `SELECT * FROM users WHERE email="${req.body.email}";`
    con.query(sql, (err, result) => {
        if (err) {
            return res.status(400).send({
                msg: err
            });
        }
        if (!result.length) {
            return res.status(401).send({
                msg: 'email or password is incorrect! 1'
            });
        }
        if (req.body.password === result[0]['password']) {
            const token = jwt.sign({
                email: result[0].email,
                userId: result[0].id
            },
            'SECRETKEY', {
                expiresIn: '7d'
            });
            res.render('pages/index', { token: token, user: result[0] });
        } else {
            return res.status(401).send({
                msg: 'email or password is incorrect! 2'
            });
        }        
    });
});

// register page
app.get('/register', function(req, res) {
    res.render('pages/register');
});


// use res.render to load up an ejs view file
app.use(express.urlencoded({ extended: true }))
app.post(
    '/register',
    [
        check('name').not().isEmpty().withMessage('nameが空です。'),
        check('email').not().isEmpty().withMessage('emailが空です。'),
        check('password').not().isEmpty().withMessage('passwordが空です。'),
        check('password').isLength({ min: 1 }).withMessage('passwordは1文字以上必要です。'),
        check('password').custom((value, { req }) => {
            return value === req.body.confirm_password
        }).withMessage('passwordとconfirmPasswordが一致しません。'),
    ],
    function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            let messages = [];
            errors.errors.forEach((error) => {
                messages.push(error.msg);
            });
            console.log(messages);
            res.render('pages/register', { messages: messages });
        } else { 
            // res.render('pages/index');
            const sql = "INSERT INTO users SET ?"
            con.query(sql, req.body, function(err, result, fields){
                if (err) throw err;
                console.log(result);
                res.render('pages/index')
            });
        }
    }
);

// home page
app.get('/', isLoggedIn, function(req, res) {
    res.render('pages/index');
})

app.listen(8080);
console.log('8080 port');
