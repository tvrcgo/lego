
module.exports = (router, $) => {
  router
    .get('/', $.home.me)
    .get('/she', $.home.she)

  // exception
  router
    .all('*', $.error.code404)
};
