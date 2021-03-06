var FeedParser = require('feedparser'),
  async = require('async'),
  tomd = require('to-markdown').toMarkdown,
  request = require('request'),
  fs = require('fs');

hexo.extend.migrator.register('ghost', function(args, callback){
  var source = args._.shift();

  if (!source){
    var help = [
      'Usage: hexo migrate ghost <source>'
      // '',
      // 'For more help, you can check the docs: http://hexo.io/docs/migration.html'
    ];

    console.log(help.join('\n'));
    return callback();
  }

  var log = hexo.log,
    post = hexo.post,
    stream;

  if (source[source.length-1] !== '/') {
    source = source + '/rss';
  } else {
    source = source + 'rss';
  }

  // URL regular expression from: http://blog.mattheworiordan.com/post/13174566389/url-regular-expression-for-links-with-or-without-the
  if (source.match(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[.\!\/\\w]*))?)/)){
    stream = request(source);
  } else {
    stream = fs.createReadStream(source);
  }

  log.i('Analyzing %s...', source);

  var feedparser = new FeedParser(),
    posts = [];

  stream.pipe(feedparser)
    .on('error', callback);

  feedparser.on('error', callback);

  feedparser.on('readable', function(){
     var stream = this,
      meta = this.meta,
      item;

    while (item = stream.read()){
      posts.push({
        title: item.title,
        slug: item.link.substring(1, item.link.length-1),
        date: item.date,
        tags: item.categories,
        content: tomd(item.description)
      });

      log.i('Post found: %s', item.title);
    }
  });

  stream.on('end', function(){
    async.each(posts, function(item, next){
      post.create(item, next);
    }, function(err){
      if (err) return callback(err);

      log.i('%d posts migrated.', posts.length);
      callback();
    });
  });
});