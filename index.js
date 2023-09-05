var debug = require('debug')('Resource'),
    express = require('express'),
    filterParser = require('./odata-filter'),
    querystring = require('querystring');

/**
 * <p>Constructs a resource.</p>
 *
 * <p>Keys</p>
 *
 * <ul>
 * <li>model (object): The instance of the Mongoose model (required).</li>
 * <li>rel (string): The absolute path of the new resource (required).</li>
 * <li>create (boolean): Specifies if the resource should support create (POST) (default true).</li>
 * <li>update (boolean): Specifies if the resource should support update (PUT) (default true).</li>
 * <li>delete (boolean): Specifies if the resource should support delete (DELETE) (default true).</li>
 * <li>lean (boolean): Whether find[ById] queries should be 'lean' and return pojos (default true).  If false then
 *         resource instances, prior to mapping an object for return, could make use of methods on the instance model.</li>
 * <li>populate (string||Array): Specifies a property, or list of properties, to populate into objects (<strong>deprecated</strong> use <code>$expand</code>).</li>
 * <li>count (boolean): Specifies if the resource should support counts on find and when traversed to by standard relationships from other types (default: false).</li>
 * </ul>
 *
 * <p>The following keys set defaults for possible query arguments.</p>
 * <ul>
 * <li>$top (number): The default value for $top if not supplied on the query string (default none).</li>
 * <li>$skip (number): The default value for $skip if not supplied on the query string (default none).</li>
 * <li>$orderby (string): The default value for $orderby if not supplied on the query string (default none).  This value
 *                      must use odata syntax like "foo asc,bar desc,baz" rather than mongo syntax like "foo -bar baz".</li>
 * <li>$orderbyPaged (string): The name of an attribute to sort results by when clients are paging, send $top, but have not
 *                           explicitly sent $orderby. (default '_id').</li>
 * <li>$select (string): The default value for $select if not supplied on the query string (default none, all properties).
 *                     If a value is supplied then $select on the query string will be ignored to protect against the
 *                     situation where the intent is to hide internal attributes (e.g. '-secret').  Unlike odata the
 *                     syntax here is passed through to mongo so the '-' prefix will be honored.</li>
 * <li>$expand (string|Array): Specifies a property or list of properties to populate into objects.  This value acts as the
 *                    default value for the <code>$expand</code> URL argument.  If the URL argument is supplied it
 *                    over-rides this value.  Nested expansion is supported.  E.g. <code>_book._author</code> will end up in
 *                    both the <code>_book</code> reference being expanded and its <code>_author</code> reference being expanded.
 *                    The corresponding Mongoose model <code>ObjectId</code> properties <strong>must</strong> have their
 *                    <code>ref</code> properties set properly or expansion cannot work.</li>
 * </ul>
 *
 * @constructor
 * @param {Object} definition The resource definition.
 */
var Resource = function(definition) {
    var self = this;
    this._definition = Object.assign({count: false},definition);
    if(this._definition.count) {
        this._definition.staticLinks = {
            'count': function(req,res) { self.count(req,res); }
        }
    }
};
/**
 * Send a response error.
 * @todo currently this function unconditionally sends the error with the response.
 * this may not be desirable since often exposing an error (e.g. stack trace) poses
 * a potential security vulnerability.
 *
 * @param  {Object} res     The express response object.
 * @param  {Number} rc      The response status code (default 500).
 * @param  {String} message The response message.
 * @param  {Object} err     The error object.
* @param  {Function} [next] Optional next callback to invoke after the response is sent with the error object.
 */
Resource.sendError = function(res,rc,message,err,next) {
    rc = rc||500;
    var response = {
        status: rc,
        message: message,
        err: err
    };
    res.status(rc).send(response);
    if(typeof(next) === 'function') {
        next(err||response);
    }
};
/**
 * Parse a $filter populating a mongoose query with its cotents.
 *
 * @param {Object} A mongoose query.
 * @param {String} A $filter value.
 */
Resource.parseFilter = filterParser;
/**
 * @return {Object} The resource definition.
 */
Resource.prototype.getDefinition = function() {
    return this._definition;
};
/**
 * @return {String} The odata service name.
 */
 Resource.prototype.getOName = function() {
    return this._definition.oname;
};
/**
 * @return {String} The odata service type.
 */
 Resource.prototype.getOType = function() {
    return this._definition.otype;
};
/**
 * @return {Object} The odata url key.
 */
 Resource.prototype.getOKey = function() {
    return this._definition.okey;
};
/**
 * @return {String} Determine node type.
 */
 Resource.prototype.getNodeType = function() {
    return this._definition.node_type;
};
/**
 * @return {Object} The rest of the content.
 */
 Resource.prototype.getContent = function() {
    return this._definition.content;
};
/**
 * @return {String} The resource relative path.
 */
Resource.prototype.getRel = function() {
    return this._definition.rel;
};
/**
 * @return {Object} The underlying mongoose model.
 */
Resource.prototype.getModel = function() {
    return this._definition.model;
};
/**
 * @return {Array} The list of static link names.
 */
Resource.prototype.getStaticLinkNames = function() {
    var def = this.getDefinition();
    return def.staticLinks ? Object.keys(def.staticLinks) : [];
};
/**
 * Sends a single object instance response.
 *
 * @param  {Object}   req        The express request object.
 * @param  {Object}   res        The express response object.
 * @param  {Array}   objs        The array of objects to send.
 * @param  {Function}   [postMapper] Optional Array.map callback that will be called with each raw object instance.
 * @param  {Function} [next]       Optional next callback to invoke after the response is sent with the response object.
 */
Resource.prototype.singleResponse = function(req,res,obj,postMapper,next) {
    var response = this.getMapper(postMapper, 1)(obj);
    res.send(response);
    if(typeof(next) === 'function') {
        next(null,response);
    }
};
Resource.prototype._listResponse = function(linkGenerator,req,res,objs,postMapper,next) {
    rel = this.getRel();
    init = this.getDefinition();// TODO
    nodeType = this.getNodeType();
    content = this.getContent();
    otype = this.getOType();
    oname = this.getOName();
    if(nodeType == "internal_db"){
        var response = {
            "@odata.id": rel,
            "@odata.type": otype,
            Members: objs.map(this.getMapper(postMapper, 0)),
            "Members@odata.count": objs.map(this.getMapper(postMapper, 0)).length,
            "Name": oname
        }
        response._links = linkGenerator(req,response);
        response = Object.assign(response, content);
    }
    else{
        var response = {
            "@odata.id": rel,
            "@odata.type": otype
        };
        response = Object.assign(response, content);
        if(content.hasOwnProperty("Members")){
            response["Members@odata.count"] = content.Members.length;
        }
        response["Name"] = oname;
    }
    res.send(response);
    if(typeof(next) === 'function') {
        next(null,response);
    }
};
Resource.prototype._findListResponse = function(req,res,objs,postMapper,next) {
    var rel = this.getRel(),
        links = this.getStaticLinkNames(),
        def = this.getDefinition();
    this._listResponse(function(){
        if(links.length) {
            var lnks = links.reduce(function(map,link){
                map[link] = rel+'/'+link;
                return map;
            },{});
            if(def.count && lnks.count) {
                var q = Object.assign({},(req.query||{}));
                delete q.$top;
                delete q.$skip;
                delete q.$orderby;
                if(Object.keys(q).length) {
                    lnks.count += '?'+querystring.stringify(q);
                }
            } else if (!def.count) {
                delete lnks.count;
            }
            return lnks;
        }
    },req,res,objs,postMapper,next);
};
/**
 * Sends a list response.
 *
 * @param  {Object}   req        The express request object.
 * @param  {Object}   res        The express response object.
 * @param  {Array}   objs        The array of objects to send.
 * @param  {Function}   [postMapper] Optional Array.map callback that will be called with each raw object instance.
 * @param  {Function} [next]       Optional next callback to invoke after the response is sent with the response object.
 */
Resource.prototype.listResponse = function(req,res,objs,postMapper,next) {
    var rel = this.getRel(),
        links = this.getStaticLinkNames();
    this._listResponse(function(){
        if(links.length) {
            return links.reduce(function(map,link){
                if(link !== 'count') {
                    map[link] = rel+'/'+link;
                }
                return map;
            },{});
        }
    },req,res,objs,postMapper,next);
};
/**
 * Sends a list response when a relationship is traversed.  This is used for standard relationships to allow the
 * static count link to be handled.
 *
 * @param  {Object}   req        The express request object.
 * @param  {Object}   res        The express response object.
 * @param  {Array}   objs        The array of objects to send.
 * @param  {Function}   [postMapper] Optional Array.map callback that will be called with each raw object instance.
 * @param  {Function} [next]       Optional next callback to invoke after the response is sent with the response object.
 */
Resource.prototype.relListResponse = function(req,res,objs,postMapper,next) {
    var rel = this.getRel(),
        links = this.getStaticLinkNames(),
        def = this.getDefinition()
    this._listResponse(function(){
        var lnks = links.reduce(function(map,link){
                map[link] = rel+'/'+link;
                return map;
            },{});
        if(def.count) {
            // replace count
            var q = Object.assign({},(req.query||{}));
            delete q.$top;
            delete q.$skip;
            delete q.$orderby;
            if(Object.keys(q).length) {
                lnks.count = req.originalUrl.substring(0,req.originalUrl.indexOf('?'))+'/count?'+querystring.stringify(q);
            } else {
                q = req.originalUrl.indexOf('?');
                lnks.count = (q !== -1 ? req.originalUrl.substring(0,q) : req.originalUrl)+'/count';
            }
        } else {
            delete lnks.count;
        }
        return lnks;
    },req,res,objs,postMapper,next);
};
/* not js-doc, don't want in output.
 * Translates an Odata $orderby clause into a mongo version.
 * http://www.odata.org/documentation/odata-version-2-0/uri-conventions/ (section 4.2)
 *
 * @param  {String} $orderby The external odata $orderby clause
 * @return {String} The string equivalent of mongoose sort.
 */
function odataOrderBy($orderby) {
    if($orderby) {
        var mongo,
            clauseExp = /^([^\s]+)\s*(asc|desc|)$/;
        $orderby.split(',').forEach(function(clause) {
            var clause_parts = clauseExp.exec(clause.trim());
            if(!clause_parts) {
                debug('orderby clause "%s" invalid, ignoring.',clause);
            } else {
                var field = clause_parts[1],
                    direction = clause_parts[2];
                if(direction === 'desc') {
                    field = '-'+field;
                }
                mongo = mongo ? (mongo+' '+field) : field;
            }
        });
        debug('translated odata orderby "%s" to mongo sort "%s"',$orderby,mongo);
        return mongo;
    }
}
/**
 * Initializes a mongoose query from a user request.
 *
 * @param  {Object} query The mongoose query.
 * @param  {Object} req   The express request object.
 * @return {Object}       The mongoose query (query input argument).
 */
Resource.prototype.initQuery = function(query,req) {
    var base = this.getDefinition(),
        def = Object.assign({
            $orderbyPaged: '_id',
            $expand: base.populate // populate is deprecated, if set its the default for $expand
        },base,req.query),
        populate = def.$expand ?
            (Array.isArray(def.$expand) ? def.$expand : [def.$expand]) : [];
        console.log(def)
        console.log(base)
        console.log(populate)
    populate.forEach(function(att){
        if(typeof(att) === 'string') {
            att.split(',').forEach(function(a) {
                a = a.trim();
                // nested expand, needs to be turned into an object instructing
                // which paths/nested paths to expand
                if(a.indexOf('.') !== -1) {
                    var parts = a.split('.'),
                        pop = { path: parts[0] },cpop = pop,i;
                    for(i = 1; i < parts.length; i++) {
                        cpop.populate = { path: parts[i] };
                        cpop = cpop.populate;
                    }
                    a = pop;
                }
                query.populate(a);
            });
        } else {
            query.populate(att);
        }
    });
    if(base.$select) {
        // don't let the caller over-ride to gain access to
        // fields that weren't intended.
        def.$select = base.$select;
    }
    if(def.$select) {
        query.select(def.$select);
    }
    if(typeof(def.lean) === 'boolean') {
        query.lean(def.lean);
    } else {
        query.lean(true); // by default go straight to a JavaScript object
    }
    if(def.$top) {
        query.limit(+def.$top);
    }
    if(def.$skip) {
        console.log('+def.$skip')
        console.log(+def.$skip)
        query.skip(+def.$skip);
    }
    if(def.$orderby) {
        query.sort(odataOrderBy(def.$orderby));
    } else if (def.$top) {
        // per the odata spec if the client is paging but not sorting then
        // we must impose a sort order to ensure responses are repeatable and
        // paged results are valid, _id is the only attribute we can count on
        // existing so sort on it.
        query.sort(def.$orderbyPaged);
    }
    if(def.$filter) {
        filterParser(query,def.$filter);
    }
    // save the query definiton for later re-use.
    req.$odataQueryDefinition = def;
    return query;
};
/**
 * <p>Builds a 'mapper' object that can be used to translate mongoose objects into
 * REST response objects.  This function can be passed to Array.map given an array of
 * mongoose objects.  All object results returned to a client should pass through a
 * mapper so that meta information like instance links can be attached.</p>
 *
 * <p><em>Note:</em> When sending custom responses you should use the [listResponse]{@link Resource#listResponse} or [singleResponse]{@link Resource#singleResponse} functions to do
 * so and those functions implicitly use a mapper.</p>
 *
 * @param  {function} postMapper Array.map callback that should be called after the underlying mapper does its work (optional).
 * @return {function}            An Array.map callback.
 */
Resource.prototype.getMapper = function(postMapper, findType) {
        rel = this.getRel();
        otype = this.getOType();
        okey = this.getOKey();
        oname = this.getOName();
        content = this.getContent();
    return function(o,i,arr) {
        if(typeof(o.toObject) === 'function') {
            if(!i) {
                // just log for single maps, or the first in an array.
                debug('%s: translating mongoose model to a pojo',rel);
            }
            o = o.toObject();
        }
        o = Object.assign(o, content)
        o["@odata.type"] = otype;
        o["Name"] = oname;
        id_sub = String(o._id).substring(String(o._id).length - 8);
        var selfLink = rel + '/' + o[okey];
        o["@odata.id"] = selfLink;
        k = {
            "@odata.id": selfLink
        };
        if(findType){
            return typeof(postMapper) === 'function' ? postMapper(o,i,arr) : o;
        }
        else{
            return typeof(postMapper) === 'function' ? postMapper(o,i,arr) : k;
        }
    };
};
/**
 * Fetches and returns to the client an entity by id.  Resources may
 * override this default functionality.
 *
 * @param  {Object} req The express request object.
 * @param  {Object} res The express response object.
 * @param  {Function} [next]       Optional next callback to invoke after the response is sent with the response object.
 */
Resource.prototype.findById = function(req,res,next) {
    var self = this,
        // def = this.getDefinition();
        query = this.initQuery(self.getModel().findById(req._resourceId),req);
    query.exec(function(err,obj){
        if(err || !obj) {
            Resource.sendError(res,404,'not found',err);
        } else {
            self.singleResponse(req,res,obj,null,next);
        }
    });
};
/**
 * Fetches and returns to the client an entity by parameters.  Resources may
 * override this default functionality.
 *
 * @param  {Object} req The express request object.
 * @param  {Object} res The express response object.
 * @param  {Function} [next]       Optional next callback to invoke after the response is sent with the response object.
 */
 Resource.prototype.findByOKey = function(req,res,next) {
    var self = this,
        // def = this.getDefinition();
        okey = this.getOKey();
        resourceId = decodeURIComponent(req._resourceId.replace(/_/g, '.'))
        query = this.initQuery(self.getModel().find({[okey]:resourceId}),req);
    query.exec(function(err,obj){
        if(err || !obj) {
            Resource.sendError(res,404,'not found',err);
        } else {
            self.singleResponse(req,res,obj[0],null,next);
        }
    });
};
/**
 * Executes a query for an entity type and returns the response to the client.
 * Resources may override this default functionality.
 *
 * @param  {Object} req The express request object.
 * @param  {Object} res The express response object.
 * @param  {Function} [next] Optional next callback to invoke after the response is sent with the response object.
 */
Resource.prototype.find = function(req,res,next) {
    var self = this,
        query = this.initQuery(self.getModel().find(),req);
    query.exec(function(err,objs){
        if(err){
            Resource.sendError(res,500,'find failed',err);
        } else {
            debug('found %d objects.', objs.length);
            self._findListResponse(req,res,objs,null,next);
        }
    });
};
/**
 * Executes a query for an entity type and returns the response to the client.
 * Resources may override this default functionality.
 *
 * @param  {Object} req The express request object.
 * @param  {Object} res The express response object.
 * @param  {Function} [next] Optional next callback to invoke after the response is sent with the response object.
 */
Resource.prototype.internalNode = function(req,res,next) {
    var self = this
    self._findListResponse(req,res,null,null,next);
};
/**
 * Executes a query for an entity type and returns the number of objects found.
 * Resources may override this default functionality.
 *
 * @param  {Object} req The express request object.
 * @param  {Object} res The express response object.
 */
Resource.prototype.count = function(req,res) {
    var self = this,
        query = this.initQuery(self.getModel().find(),req);
    query.countDocuments(function(err,n){
        if(err){
            Resource.sendError(res,500,'find failed',err);
        } else {
            res.json(n);
        }
    });
};
/**
 * Creates an instance of this entity type and returns the newly created
 * object to the client.
 *
 * @param  {Object} req The express request object.
 * @param  {Object} res The express response object.
 * @param  {Function} [next] Optional next callback to invoke after the response is sent with the response object.
 */
Resource.prototype.create = function(req,res,next) {
    var self = this,
        Model = self.getModel(),
        instance = new Model(req.body);
    instance.save(function(err,saved){
        if(err) {
            return Resource.sendError(res,500,'create failure',err,next);
        }
        // re-fetch the object so that nested attributes are properly populated.
        req._resourceId = saved._id;
        self.findById(req,res,next);
    });
};
/**
 * <p>Updates an instance of this entity type and returns the updated
 * object to the client.</p>
 *
 * <p><em>Note:</em> This implementation of update is more similar to PATCH in that
 * it doesn't require a complete object to update.  It will accept a sparsely populated
 * input object and update only the keys found within that object.</p>
 *
 * @param  {Object} req The express request object.
 * @param  {Object} res The express response object.
 * @param  {Function} [next] Optional next callback to invoke after the response is sent with the response object.
 */
Resource.prototype.update = function(req,res,next) {
    var self = this,
        model = self.getModel();
    // not using findOneAndUpdate because helpers are not applied
    model.findOne({_id: req._resourceId},function(err,obj){
        if(err) {
            return Resource.sendError(res,404,'not found',err,next);
        }
        Object.keys(req.body).forEach(function(key){
            obj[key] = req.body[key];
        });
        obj.save(function(err,obj) {
            if(err) {
                return Resource.sendError(res,500,'update failure',err,next);
            }
            // re-fetch the object so that nested attributes are properly populated.
            self.findById(req,res,next);
        });
    });
};
/**
 * Deletes an instance of this entity type.
 *
 * @param  {Object} req The express request object.
 * @param  {Object} res The express response object.
 * @param  {Function} [next] Optional next callback to invoke after successful delete with the model object.
 */
Resource.prototype.delete = function(req,res,next) {
    var self = this,
        query = self.initQuery(self.getModel().findById(req._resourceId),req);
    query.lean(false); // need the object itself regardless of how the resource is defined
    query.exec(function(err,obj){
        if(err || !obj) {
            return Resource.sendError(res,404,'not found',err,next);
        }
        obj.remove(function(err,obj){
            if(err) {
                return Resource.sendError(res,500,'remove error',err,next);
            }
            res.status(200).send();
            if(typeof(next) === 'function') {
                next(null,obj);
            }
        });
    });
};
/**
 * Add a static link implementation to this resource.
 *
 * @param  {String} rel  The relative path of the link.
 * @param  {function} link A function to call when the static link is requested.  The
 *                         arguments are (req,res) which are the express request and response
 *                         objects respectively.
 * @return {Object}      this
 */
Resource.prototype.staticLink = function(rel,link) {
    // for now static links are functions only
    var def = this._definition,
        links = def.staticLinks;
    if(!links) {
        links = def.staticLinks = {};
    }
    links[rel] = link;
    return this;
};
/**
 * Initializes and returns an express router.
 * If app is supplied then app.use is called to bind the
 * resource's 'rel' to the router.
 *
 * @param  {object} app Express app (optional).
 * @return {object}     Express router configured for this resource.
 */
Resource.prototype.initRouter = function(app) {
    var self = this,
        resource = self._definition,
        router = express.Router();
        nodeType = this.getNodeType();
    if(resource.staticLinks) {
        Object.keys(resource.staticLinks).forEach(function(link){
            var linkObj = resource.staticLinks[link],
                linkObjType = typeof(linkObj);
            if(linkObjType === 'function') {
                router.get('/'+link,(function(self){
                    return function(req,res) {
                        linkObj.apply(self,arguments);
                    };
                })(self));
            }
        });
    }
    router.param('id',function(req,res,next,id){
        req._resourceId = id;
        next();
    });
    if(nodeType == "internal_db"){
        router.get('/', (function(self){
            return function(req,res) {
                self.find(req,res);
            };
        })(this));
    }
    else if(nodeType == "internal"){
        router.get('/', (function(self){
            return function(req,res) {
                self.internalNode(req,res);
            };
        })(this));
    }
    if(app) {
        app.use(this.getRel(),router);
    }
    return router;
};
module.exports = Resource;
