require('dotenv').config();

// load the things we need
const { PrismaClient } = require("@prisma/client");
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const { check, validationResult } = require('express-validator');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const saltRounds = 10
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();

const con = mysql.createConnection({
    host: process.env.HOSTNAME,
    user: process.env.USERNAME,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    port: process.env.PORT
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
app.post('/login', async (req, res, next) => {
    const { id, email, password } = req.body;
    const user = await prisma.user.findUnique({where: {email}})
    if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({
        email: email,
        userId: id
    },
    'SECRETKEY', {
        expiresIn: '7d'
    });
    res.render('pages/index', { token: token, user: user });
    } else {
        return res.status(401).send({
            msg: 'email or password is incorrect!'
        });
    }        
});

// register page
app.get('/register', function(req, res) {
    res.render('pages/register');
});
app.use(express.urlencoded({ extended: true }));
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
            bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {
                req.body.password = hash;
                req.body.confirm_password = hash;
                const { name, email, password, confirm_password } = req.body;
                try {await prisma.user.create({
                    data: {
                        name,
                        email,
                        password,
                        confirm_password,
                    },
                });
                res.render('pages/index');
            } catch (err) {
                return res.status(400).json(err);
            }
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
