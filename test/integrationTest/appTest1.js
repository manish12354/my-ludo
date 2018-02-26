const assert = require('chai').assert;
const request = require('supertest');
const path = require('path');
const app = require(path.resolve('app.js'));
const GamesManager = require(path.resolve('src/models/gamesManager.js'));
const EventEmitter = require('events');
const ColorDistributer = require(path.resolve('test/colorDistributer.js'));
let doesNotHaveCookies = (res) => {
  const keys = Object.keys(res.headers);
  let key = keys.find(currentKey => currentKey.match(/set-cookie/i));
  if (key) {
    throw new Error(`Didnot expect Set-Cookie in header of ${keys}`);
  }
};

const dice = {
  roll: function() {
    return 4;
  }
};

const initGamesManager = function(playerNames){
  let gamesManager = new GamesManager(ColorDistributer,dice,EventEmitter);
  gamesManager.addGame('ludo');
  playerNames.forEach(function(playerName){
    gamesManager.addPlayerTo('ludo',playerName);
  });
  return gamesManager;
};

describe('#App', () => {
  let gamesManager = {};
  beforeEach(function() {
    gamesManager = new GamesManager(ColorDistributer,dice,EventEmitter);
    app.initialize(gamesManager);
  });
  describe('#GET /', () => {
    it('should serve index page', done => {
      request(app)
      .get('/')
      .expect(200)
      .expect(/createGame/)
      .expect(/joinGame/)
      .end(done);
    });
    it('should redirect to waiting page if valid cookies are present', done => {
      gamesManager.addGame('newGame');
      gamesManager.addPlayerTo('newGame', 'lala');
      app.initialize(gamesManager);
      request(app)
        .get('/')
        .set('Cookie', ['gameName=newGame', 'playerName=lala'])
        .expect(302)
        .expect('Location', '/waiting.html')
        .end(done);
    });
    it('should serve index page if invalid cookies are present', done => {
      gamesManager.addGame('newGame');
      gamesManager.addPlayerTo('newGame', 'lala');
      app.initialize(gamesManager);
      request(app)
        .get('/')
        .set('Cookie', ['gameName=badGame', 'playerName=badUser'])
        .expect(200)
        .end(done);
    });
  });
  describe('GET /index.html', () => {
    it('should redirect to waiting page if valid cookies are present', done => {
      gamesManager.addGame('newGame');
      gamesManager.addPlayerTo('newGame', 'lala');
      app.initialize(gamesManager);
      request(app)
      .get('/index.html')
      .set('Cookie', ['gameName=newGame', 'playerName=lala'])
      .expect(302)
      .expect('Location', '/waiting.html')
      .end(done);
    });
    it('should serve index page if invalid cookies are present', done => {
      gamesManager.addGame('newGame');
      gamesManager.addPlayerTo('newGame', 'lala');
      app.initialize(gamesManager);
      request(app)
      .get('/index.html')
      .set('Cookie', ['gameName=badGame', 'playerName=badUser'])
      .expect(200)
      .end(done);
    });
  });
  describe('GET /board.html', () => {
    it('should serve index page', done => {
      request(app)
        .get('/board.html')
        .expect(302)
        .expect('Location','/index.html')
        .end(done);
    });
  });
  describe('GET /joining.html', () => {
    it('should redirect to waiting page if valid cookies are present', done => {
      gamesManager.addGame('newGame');
      gamesManager.addPlayerTo('newGame', 'lala');
      app.initialize(gamesManager);
      request(app)
      .get('/joining.html')
      .set('Cookie', ['gameName=newGame', 'playerName=lala'])
      .expect(302)
      .expect('Location', '/waiting.html')
      .end(done);
    });
    it('should serve joining page if invalid cookies are present', done => {
      gamesManager.addGame('newGame');
      gamesManager.addPlayerTo('newGame', 'lala');
      app.initialize(gamesManager);
      request(app)
      .get('/joining.html')
      .set('Cookie', ['gameName=badGame', 'playerName=badUser'])
      .expect(200)
      .end(done);
    });
  });
  describe('POST /createGame', () => {
    it('should set gameName and playerName in cookie', (done) => {
      request(app)
        .post('/createGame')
        .send('gameName=newGame&playerName=dhana')
        .expect(200)
        .expect('set-cookie', 'gameName=newGame,playerName=dhana')
        .expect(JSON.stringify({
          status: true
        }))
        .end(done);
    });
    it('should not create game if game name already exist', (done) => {
      gamesManager.addGame('newGame');
      app.initialize(gamesManager);
      request(app)
        .post('/createGame')
        .send('gameName=newGame&playerName=dhana')
        .expect(200)
        .expect(JSON.stringify({
          status: false,
          message: 'game name already taken'
        }))
        .expect(doesNotHaveCookies)
        .end(done);
    });
    it('should not create game if player name exceeds 8 characters',(done)=>{
      request(app)
      .post('/createGame')
      .send('gameName=newGame&playerName=dhanalakshmi')
      .expect(400)
      .expect(JSON.stringify({
        status: false,
        message: 'bad request'
      }))
      .expect(doesNotHaveCookies)
      .end(done);
    });
    it('should not create game if game name exceeds 15 characters',(done)=>{
      request(app)
      .post('/createGame')
      .send('gameName=dhanalakshmi\'sGame&playerName=dhana')
      .expect(400)
      .expect(JSON.stringify({
        status: false,
        message: 'bad request'
      }))
      .expect(doesNotHaveCookies)
      .end(done);
    });
    it('should simply end the response if request body is not correctly formatted', function(done) {
      request(app)
        .post('/createGame')
        .send('gamme=newGame&plaame=dhana')
        .expect(400)
        .expect(doesNotHaveCookies)
        .end(done);
    });
    it('should redirect to waiting if user has already a game', function(done) {
      let gamesManager = new GamesManager(ColorDistributer,dice,EventEmitter);
      gamesManager.addGame('newGame');
      gamesManager.addPlayerTo('newGame', 'lala');
      app.initialize(gamesManager);
      request(app)
        .post('/createGame')
        .set('Cookie', ['gameName=newGame', 'playerName=lala'])
        .send('gameName=bad&playerName=dhana')
        .expect(200)
        .expect(/status/)
        .expect(/true/)
        .end(done);
    });
    it('should response with error message if gamename or playername is empty',(done)=>{
      request(app)
        .post('/createGame')
        .send('gameName=   &playerName=  ')
        .expect(400)
        .expect(JSON.stringify({status:false,message:'empty field'}))
        .end(done);
    });
  });
  describe('DELETE /player', () => {
    it('should delete Player and game if all the players left', (done) => {
      let gamesManager = initGamesManager(['player']);
      app.initialize(gamesManager);
      request(app)
        .delete('/player')
        .set('Cookie', ['playerName=player;', 'gameName=ludo;'])
        .expect(200)
        .expect('set-cookie', `playerName=; Expires=${new Date(1).toUTCString()},gameName=; Expires=${new Date(1).toUTCString()}`)
        .end(done);
    });
    it('should delete Player if a player lefts', (done) => {
      let gamesManager = initGamesManager(['player1','player2','player3']);
      app.initialize(gamesManager);
      request(app)
        .delete('/player')
        .set('Cookie', ['playerName=player1;', 'gameName=ludo;'])
        .expect(200)
        .expect('set-cookie', `playerName=; Expires=${new Date(1).toUTCString()}`)
        .end(done);
    });
  });
  describe('POST /joinGame', () => {
    beforeEach(function() {
      let gamesManager=initGamesManager(['player1','player2','player3']);
      app.initialize(gamesManager);
    })
    it('should return joiningStatus as true if new player is joining', done => {
      request(app)
        .post('/joinGame')
        .send('gameName=ludo&playerName=player4')
        .expect(/status/)
        .expect(/true/)
        .end(done)
    });
    it('should return joining Status as false if the form is incomplete', done => {
      request(app)
        .post('/joinGame')
        .send('gameName=ludo')
        .expect(/status/)
        .expect(/false/)
        .end(done)
    });
    it('should return status false for bad request', done => {
      request(app)
        .post('/joinGame')
        .send('gameName=&playerName=')
        .expect(400)
        .expect(/status/)
        .expect(/false/)
        .end(done)
    });
    it('should return status false for join with name which is previously in game', done => {
      request(app)
        .post('/joinGame')
        .send('gameName=ludo&playerName=player1')
        .expect(200)
        .expect('{"status":false}')
        .expect(doesNotHaveCookies)
        .end(done)
    });
    it('should return status false along with message "player name is lengthy"',(done)=>{
      request(app)
        .post('/joinGame')
        .send('gameName=ludo&playerName=lalalalalala')
        .expect(400)
        .expect(`{"status":false,"message":"bad request"}`)
        .expect(doesNotHaveCookies)
        .end(done)
    });
    it('should return status false along with message "game dosen\'t exist"', (done) => {
      request(app)
      .post('/joinGame')
      .send('gameName=helloWorld&playerName=lala')
      .expect(400)
      .expect(`{"status":false,"message":"game dosen\'t exist"}`)
      .expect(doesNotHaveCookies)
      .end(done);
    });
    it('should return status false along with message "empty field"', (done) => {
      request(app)
      .post('/joinGame')
      .send('gameName=    &playerName=   ')
      .expect(400)
      .expect(`{"status":false,"message":"empty field"}`)
      .expect(doesNotHaveCookies)
      .end(done);
    });
  });
  describe('#GET /index.html', () => {
    it('should redirect to waiting page if valid cookies are present', done => {
      gamesManager.addGame('newGame');
      gamesManager.addPlayerTo('newGame', 'lala');
      app.initialize(gamesManager);
      request(app)
        .get('/index.html')
        .set('Cookie', ['gameName=newGame', 'playerName=lala'])
        .expect(302)
        .expect('Location', '/waiting.html')
        .end(done);
    });
    it('should serve index page if invalid cookies are present', done => {
      gamesManager.addGame('newGame');
      gamesManager.addPlayerTo('newGame', 'lala');
      app.initialize(gamesManager);
      request(app)
        .get('/index.html')
        .set('Cookie', ['gameName=badGame', 'playerName=badUser'])
        .expect(200)
        .end(done);
    });
  });
  describe('#GET /joining.html', () => {
    it('should redirect to waiting page if valid cookies are present', done => {
      gamesManager.addGame('newGame');
      gamesManager.addPlayerTo('newGame', 'lala');
      app.initialize(gamesManager);
      request(app)
        .get('/joining.html')
        .set('Cookie', ['gameName=newGame', 'playerName=lala'])
        .expect(302)
        .expect('Location', '/waiting.html')
        .end(done);
    });
    it('should serve joining page if invalid cookies are present', done => {
      gamesManager.addGame('newGame');
      gamesManager.addPlayerTo('newGame', 'lala');
      app.initialize(gamesManager);
      request(app)
        .get('/getAvailableGames')
        .expect(200)
        .expect('[{"name":"newGame","remain":3,"createdBy":"lala"}]')
        .end(done);
    });
  });
  describe('#waitingStatus', () => {
    it('should give the joining status', (done) => {
      let gamesManager = initGamesManager(['ashish','joy']);
      app.initialize(gamesManager);
      request(app)
        .get('/waitingStatus')
        .set('Cookie',['gameName=ludo','playerName=joy'])
        .expect(200)
        .expect(/ashish/)
        .end(done)
    });
    it('should response with 400 if game is not present',function(done){
      request(app)
        .get('/waitingStatus')
        .set('Cookie',['gameName=cludo','playerName=joy'])
        .expect(400)
        .end(done)
    })
  });
});
