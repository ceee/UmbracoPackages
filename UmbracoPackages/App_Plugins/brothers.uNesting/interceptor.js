angular.module('umbraco.services').config(['$httpProvider', function ($httpProvider)
{
  $httpProvider.interceptors.push(['$q', '$injector', 'notificationsService', function ($q, $injector, notificationsService)
  {
    return {
      'request': function (request)
      {
        if (request.url.indexOf("views/propertyeditors/nestedcontent/nestedcontent.html") === 0)
        {
          request.url = '/App_Plugins/brothers.uNesting/uNesting.html';
        }

        return request || $q.when(request);
      }
    };
  }]);
}]);