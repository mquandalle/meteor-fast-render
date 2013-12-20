//When a HTTP Request comes, we need to figure out is it a proper request
//then get some query data
//then hijack html return by meteor
//code below, does that in abstract way

var http = Npm.require('http');

var injectTemplate;
Assets.getText('server/inject.html', function(err, text) {
  if(err) {
    console.error('Error reading fast-render inject.html: ', err.message);
  } else {
    injectTemplate = _.template(text.trim());
  }
});

var originalWrite = http.OutgoingMessage.prototype.write;
http.OutgoingMessage.prototype.write = function(a, b) {
  if(this.queryData) {
    //inject them
    if(injectTemplate) {
      var ejsonString = EJSON.stringify(this.queryData);
      var injectHtml = injectTemplate({ejsonString: ejsonString});
      a = a.replace('</head>', injectHtml + '\n</head>');
    } else {
      console.warn('injectTemplate is not ready yet!');
    }
  }
  originalWrite.call(this, a, b);
};

//meteor algorithm to check if this is a meteor serving http request or not
//add routepolicy package to the fast-render
function appUrl(url) {
  if (url === '/favicon.ico' || url === '/robots.txt')
    return false;

  // NOTE: app.manifest is not a web standard like favicon.ico and
  // robots.txt. It is a file name we have chosen to use for HTML5
  // appcache URLs. It is included here to prevent using an appcache
  // then removing it from poisoning an app permanently. Eventually,
  // once we have server side routing, this won't be needed as
  // unknown URLs with return a 404 automatically.
  if (url === '/app.manifest')
    return false;

  // Avoid serving app HTML for declared routes such as /sockjs/.
  if (RoutePolicy.classify(url))
    return false;

  // we currently return app HTML on all URLs by default
  return true;
};

//check page and add queries
WebApp.connectHandlers.use(function(req, res, next) {
  if(appUrl(req.url)) {
    FastRender._processRoutes(req.url, function(queryData) {
      res.queryData = queryData;
      next();
    });
    //run our route handlers and add proper queryData
  }
});
