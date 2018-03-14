var express = require('express'),
    Resource = require('../../index.js'),
    models = require('./models'),
    app = express();

app.use(require('body-parser').json());


app.get('/', function (req, res) {
  res.send('odata-resource test server');
});

var authors = new Resource({
        rel: '/api/authors',
        model: models.Author,
    }).instanceLink('books',function(req,res){
        var query = books.initQuery(books.getModel().find({_author: req._resourceId}),req);
        query.exec(function(err,bks){
            if(err){
                return Resource.sendError(res,500,'error finding books',err);
            }
            books.listResponse(req,res,bks);
        });
    }),
    reviews = new Resource({
        rel: '/api/reviews',
        model: models.Review,
        count: true
    }),
    books = new Resource({
        rel: '/api/books',
        model: models.Book,
        $orderby: 'title',
        $expand: '_author',
        count: true
    }).instanceLink('reviews',{
        otherSide: reviews,
        key: '_book'
    }).staticLink('genres',function(req,res){
        this.getModel().distinct('genre',function(err,genres){
            if(err){
                return Resource.sendError(res,500,'error getting genres',err);
            }
            res.send(genres);
        });
    });

authors.initRouter(app);
reviews.initRouter(app);
books.initRouter(app);

module.exports = app;
