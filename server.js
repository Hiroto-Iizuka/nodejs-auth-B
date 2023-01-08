require('dotenv').config();

// load the things we need
const { PrismaClient } = require("@prisma/client");
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const { check, validationResult, body } = require('express-validator');
const bcrypt = require('bcrypt');
const saltRounds = 10
const jwt = require("jsonwebtoken");
const localStorage = require('local-storage');
const { decode } = require('json-web-token');

const prisma = new PrismaClient();

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
// app.use((req, res, next) => {
//     if (!req.headers.authorization) {
//         const data = { message: 'Authorization required' };
//         return res.status(401).send(data);
//     }

//     const token = req.headers.authorization.split(' ')[1];
//     let decoded;
//     try {
//         decoded = jwt.verify(token, 'SECRETKEY');
//     } catch (err) {
//         console.error({err});
//         const data = { message: `Invalid token: ${err.message}` };
//         return res.status(401).send(data);
//     }

//     if (!decoded || decoded.user_id || decoded.user_id !== req.body.user_id) {
//         const data = { message: `Invalid token or user_id unmatch: ${decoded.user_id}, ${req.body.user_id}` };
//         return res.status(401).send(data);
//     }

//     next();
// });


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
    localStorage.set('token', token);
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
                try { await prisma.user.create({
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

// post page
app.get('/post', function(req, res) {
    res.render('pages/post');
});
app.post('/posts',
    async function (req, res) {
        const token = localStorage.get('token');
        try {
            const decoded = jwt.verify(token, 'SECRETKEY');
            const email = decoded.email;
            const user = await prisma.user.findUnique({where: {email}});
            const authorId = user.id;
            const { title, content } = req.body;
            try { await prisma.post.create({
                data: {
                    title,
                    content,
                    authorId,
                },
            });
            res.render('pages/index');
            } catch (err) {
                return res.status(400).json(err);
            }    
          } catch (e) {
            console.error({e});
          }
    }
);

// home page
app.get('/', isLoggedIn, function(req, res) {
    res.render('pages/index');
})

app.listen(8080);
console.log('8080 port');
