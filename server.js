const express = require('express');
const exphbs = require('express-handlebars');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const hbs = exphbs.create({});
const routes = require('./routes');
const sequelize = require('./config/connection');
const path = require('path');

// const initPassport = require('./utils/passport-helper');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const {User} = require('./models');

require('dotenv').config();


const sess = {
  secret: process.env.Sess_Secret,
  cookie: {},
  resave: false,
  saveUninitialized: true,
  store: new SequelizeStore({
    db: sequelize
  })
};

const app = express();
const PORT = process.env.PORT || 3001;

app.use(session(sess));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// passport code
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  async (username, password, done) => {
    const user = await User.findOne({where: {username}});
    if (!user) {return done(null, false, {message: "incorrect username"})};
    if (!user.checkPassword(password)) {return done(null, false, {message: "incorrect password"})};
    return done(null, user);
  }
));
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findByPk(id).then(user => {
    return done(null, user);
  })
  .catch(err => done(err));
})
app.post('/login', passport.authenticate('local', {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: true
}));
app.get('/login', (req, res) => {
  console.log(req.isAuthenticated());
  if (req.isAuthenticated()) return res.redirect('/');
  res.render('login');
});
app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
})

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// turn on routes
app.use(routes);

// turn on connection to db and server
sequelize.sync({ force: true }).then(() => {
  app.listen(PORT, () => console.log(`Now listening on port ${PORT}`));
});
