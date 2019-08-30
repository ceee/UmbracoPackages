
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
        else if (request.url.indexOf("views/propertyeditors/nestedcontent/nestedcontent.doctypepicker.html") === 0)
        {
          request.url = '/App_Plugins/brothers.uNesting/uNesting.doctypepicker.html';
        }
        else if (request.url.indexOf(Umbraco.Sys.ServerVariables.umbracoSettings.umbracoPath + "/views/propertyeditors/nestedcontent/nestedcontent.editor.html") === 0)
        {
          request.url = '/App_Plugins/brothers.uNesting/uNesting.editor.html';
        }

        return request || $q.when(request);
      }
    };
  }]);
}]);




angular.module("umbraco").controller("brothers.uNesting.DocTypePickerController", function ($scope, $controller)
{
  angular.extend(this, $controller('Umbraco.PropertyEditors.NestedContent.DocTypePickerController', { $scope: $scope }));
});


angular.module("umbraco").controller("brothers.uNesting.PropertyEditorController", function ($scope, $controller, $http, $compile)
{
  angular.extend(this, $controller('Umbraco.PropertyEditors.NestedContent.PropertyEditorController', { $scope: $scope }));

  $scope.clickHide = function ($event, node)
  {
    $($event.target).closest('.unesting-item').find('.umb-property[unesting-property="uNestingHide"] .umb-toggle').trigger('click');
    if ($scope.realCurrentNode)
    {
      $scope.$broadcast("ncSyncVal", { key: $scope.realCurrentNode.key });
    }
    $event.stopPropagation();
  };

  $scope.canHide = function (item)
  {
    return typeof item['uNestingHide'] !== 'undefined';
  };

  $scope.isHidden = function (index)
  {
    var item = $scope.model.value[index];
    return item['uNestingHide'] === '1';
  };
});




angular.module('umbraco.directives').directive('unContent', function ($compile)
{
  return {
    restrict: 'E',
    scope: {
      item: '=',
      node: '=',
      config: '='
    },
    link: function (scope, element)
    {
      // get template
      var template = scope.config && scope.config.nameTemplate ? scope.config.nameTemplate : null;

      // compile & render template
      function render()
      {
        // merge element values into local scope
        angular.merge(scope, scope.item);

        // nothing when no template is specified
        if (!template)
        {
          element.html('');
          //element.html(scope.node.documentType.description);
          return;
        }

        // create html and compile
        element.html(template);
        $compile(element.contents())(scope);
      }

      //scope.$watch('item', function (value)
      //{
      //  render();
      //});

      // first-time rendering
      render();
    }
  };
});


angular.module('umbraco.directives').directive('unMedia', function ($http, $compile, umbRequestHelper)
{
  return {
    restrict: 'E',
    scope: {
      items: '=',
      key: '@',
      titleKey: '@',
      limit: '@'
    },
    template: '' +
    '<div class="unesting-media">' +
      '<div class="unesting-media-item" ng-repeat="item in media" ng-class="{\'has-title\': !!item.title}">' +
        '<img src="{{item.src}}" title="{{item.title}}" class="unesting-media-item-image" />' +
        '<span class="unesting-media-item-text" ng-if="item.title">{{item.title | unHtml }}</span>' +
      '</div>' +
      '<span class="unesting-media-more" ng-if="count > media.length">+{{count - media.length}}</span>' +
    '</div>',
    link: function (scope, element)
    {
      var resize = 'width=50&height=50&mode=crop&quality=60';
      var limit = scope.limit || 5;
      scope.media = [];

      var titleCache = {};

      // compile & render template
      function render()
      {
        var ids = scope.items;

        if (!scope.items)
        {
          return;
        }
        if (_.isArray(scope.items))
        {
          if (!scope.key)
          {
            console.error("You need the <un-media key='my_key' /> property for nested media");
            return;
          }

          ids = _.map(scope.items, function (item)
          {
            var value = item[scope.key];

            if (scope.titleKey)
            {
              titleCache[value] = item[scope.titleKey];
            }

            return value;
          }).join(',');
        }

        ids = ids.split(',');
        scope.count = ids.length;

        var query = "ids=" + ids.slice(0, limit).join('&ids=');
        var url = $http.get(umbRequestHelper.getApiUrl("mediaApiBaseUrl", "GetByUdis", query).replace("/Media/", "/MediaExtended/"));
        // TODO we have to implement this method in a controller
        umbRequestHelper.resourcePromise(url, 'Failed to retrieve data for media ids').then(function (result)
        {
          _.each(result, function (src, id)
          {
            scope.media.push({
              id: id,
              src: src + "?" + resize,
              title: titleCache[id]
            });
          });
        });
      }

      render();
    }
  };
});



angular.module('umbraco').filter('unHtml', function () 
{
  return function (html, maxLength)
  {
    if (!html)
    {
      return '';
    }
    if (!maxLength)
    {
      maxLength = 120;
    }

    var stripped = html.replace('<br>', ' ').replace('<br />', ' ').replace('<br/>', ' ').replace(/<[^>]+>/gm, '');

    return stripped.length > maxLength ? (stripped.substring(0, maxLength) + '...') : stripped;
  };
});