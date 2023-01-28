require('dotenv').config();

// load the things we need
const { PrismaClient } = require("@prisma/client");
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const methodOverride = require("method-override");
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const saltRounds = 10
const jwt = require("jsonwebtoken");
const localStorage = require('local-storage');
const fs = require('fs');

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

const checkJWT = async (req, res, next) => {
    const token = localStorage.get('token');

    if(!token) {
        res.status(400).json([{ message: '権限がありません' }]);
    } else {
        try {
            let user = await jwt.verify(token, 'SECRETKEY');
            console.log(user);
            req.user = user.email;
            next();
        } catch {
            return res.status(400).json([{ message: 'トークンが一致しません'}]);
        }
    }
}
  
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
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

//post index page
app.get('/posts', checkJWT, async function(req, res) {
    const posts = await prisma.post.findMany({
        include: {
            users: true
        }
    });
    const postsJson = await Promise.all(posts.map(async post => {
        const id = post.authorId;
        const user = await prisma.user.findUnique({where: {id}});
        post["name"] = user.name;
        return post;
    }));
    const token = localStorage.get('token');
    try {
        const decoded = jwt.verify(token, 'SECRETKEY');
        const email = decoded.email;
        const user = await prisma.user.findUnique({where: {email}});
        res.render('pages/posts', { posts: postsJson, currentUser: user });
    } catch (err) {
        console.log(err);
    }
});

// post create page
app.post('/posts',
    checkJWT,
    [check('content').isLength({ max: 140 }).withMessage('contentは140文字以内です。')],
    async function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            let messages = [];
            errors.errors.forEach((error) => {
                messages.push(error.msg);
            });
            console.log(messages);
            res.render('pages/post', { messages: messages });
        } else {
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
          } catch (err) {
            console.error({err});
          }
    }
});

app.get('/posts/:id', checkJWT, async function (req, res) {
    const id = parseInt(req.params.id);
    const post = await prisma.post.findUnique({where: {id}});
    res.render('pages/edit', { post: post });
});

app.patch('/posts/:id', checkJWT, async (req, res) => {
    const id = parseInt(req.params.id);
    const { title, content } = req.body;
    try {
        await prisma.post.update({
            where: {
                id: id,
            },
            data: {
                title: title,
                content: content,
            }
        });
        res.redirect('/posts');
    } catch (err) {
        return res.status(400).json(err);
    }
});

app.delete('/posts/:id', checkJWT, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await prisma.post.delete({
            where: {
                id: id,
            }
        });
        res.redirect('/posts');
    } catch (err) {
        return res.status(400).json(err);
    }
});

app.post('/favorite/:id', async (req, res) => {
    const token = localStorage.get('token');
    try {
        const decoded = jwt.verify(token, 'SECRETKEY');
        const email = decoded.email;
        const currentUser = await prisma.user.findUnique({where: {email}});
        const userId = parseInt(currentUser.id);
        const name = currentUser.name;
        const postId = parseInt(req.params.id);
        const post = prisma.post.findUnique({where: {postId}});
        const title = post.title
        const count = 1;
        try { await prisma.favorite.create({
            data: {
                postId,
                userId,
            },
        });
        res.render('pages/index');
        } catch (err) {
            return res.status(400).json(err);
        }
      } catch (err) {
        console.error({err});
      }
});

// home page
app.get('/', isLoggedIn, function(req, res) {
    res.render('pages/index');
});

app.listen(8080);
console.log('8080 port');
