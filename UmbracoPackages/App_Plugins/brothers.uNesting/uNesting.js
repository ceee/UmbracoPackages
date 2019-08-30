
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

  $scope.clickHide = function ($event, node, $index)
  {
    $event.preventDefault();
    $event.stopPropagation();
    $($event.target).closest('.unesting-item').find('.umb-property[unesting-property="uNestingHide"] .umb-toggle').trigger('click');
    $scope.model.value[$index]['uNestingHide'] = !$scope.model.value[$index]['uNestingHide'];
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
  var sizes = {
    small: 'width=30&height=30&mode=crop&quality=60',
    medium: 'width=60&height=60&mode=crop&quality=60',
    large: 'width=100&height=100&mode=crop&quality=60',
    wide: 'width=100&height=60&mode=crop&quality=60',
    high: 'width=60&height=100&mode=crop&quality=60'
  };

  return {
    restrict: 'E',
    scope: {
      model: '=',
      key: '@',
      titleKey: '@',
      limit: '@',
      size: '@',
      hideLabel: '@'
    },

    template: '<div class="unesting-media" unesting-size="{{_size}}">' +
                '<div class="unesting-media-item" ng-repeat="item in media" ng-class="{\'has-title\': !!item.title}">' +
                  '<img src="{{item.src}}" title="{{item.title}}" class="unesting-media-item-image" />' +
                  '<span class="unesting-media-item-text" ng-if="item.title">{{item.title | unHtml }}</span>' +
                '</div>' +
                '<span class="unesting-media-more" ng-if="count > media.length">+{{count - media.length}}</span>' +
              '</div>',

    link: function (scope, element)
    {
      scope._size = sizes[scope.size] ? scope.size : 'medium';

      var resize = sizes[scope._size];
      var limit = scope.limit || 5;
      scope.media = [];

      var titleCache = {};


      // compile & render template
      function render()
      {
        var ids = scope.model;

        if (!scope.model)
        {
          return;
        }

        if (_.isArray(scope.model))
        {
          if (typeof scope.model[0] !== 'string' && !scope.key)
          {
            console.error("You need the <un-media key='my_key' /> property for nested media");
            return;
          }

          ids = _.map(scope.model, function (item)
          {
            if (typeof item === 'string')
            {
              return item;
            }

            var value = item[scope.key];

            if (scope.titleKey)
            {
              titleCache[value] = item[scope.titleKey];
            }

            return value;
          }).join(',');
        }

        ids = _.filter(ids.split(','), function (id) { return !!id; });
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

          // hide label if requested
          if (scope.media.length > 0 && (scope.hideLabel === true || scope.hideLabel === 'true' || scope.hideLabel === '1'))
          {
            element.closest('.unesting-item-header').addClass('no-label');
          }
        });
      }

      render();
    }
  };
});



angular.module('umbraco.directives').directive('unText', function ($filter)
{
  return {
    restrict: 'E',
    scope: {
      model: '=',
      maxLines: '@',
      hideLabel: '@'
    },

    template: '<div class="unesting-text" ng-if="items.length" ng-style="{ \'-webkit-line-clamp\': {{maxLines}}, \'max-height\': \'{{maxLines * 20}}px\' }">' +
                '<span class="unesting-text-partial" unesting-index="{{$index}}" ng-repeat="text in items" ng-bind-html="text"></span>' + 
              '</div>',

    link: function (scope, element)
    {
      scope.maxLines = +scope.maxLines || 2;
      scope.items = [];

      if (!scope.model)
      {
        return;
      }

      // hide label if requested
      if (scope.hideLabel === true || scope.hideLabel === 'true' || scope.hideLabel === '1')
      {
        element.closest('.unesting-item-header').addClass('no-label');
      }

      var partials = _.filter(!_.isArray(scope.model) ? [scope.model] : scope.model, function (text) { return !!text; });

      scope.items = _.map(partials, function (text)
      {
        return $filter('unHtml')(text, 1000);
      });
    }
  };
});



angular.module('umbraco.directives').directive('unBoxes', function ($compile)
{
  return {
    restrict: 'E',
    scope: {
      model: '=',
      key: '@',
      titleKey: '@',
      limit: '@',
      size: '@',
      hideLabel: '@'
    },

    template: '<div class="unesting-boxes" unesting-size="{{size}}">' +
                '<div class="unesting-boxes-item" ng-repeat="item in items" ng-class="{\'has-title\': !!item.title}">' +
                  '<span class="unesting-boxes-item-headline" ng-if="item.headline">{{item.headline | unHtml }}</span>' +
                  '<span class="unesting-boxes-item-text" ng-if="item.text" ng-style="{ \'max-height\': \'{{item.maxLines * 20}}px\', \'-webkit-line-clamp\': {{item.maxLines}} }">{{item.text | unHtml:200 }}</span>' +
                '</div>' +
                '<span class="unesting-boxes-more" ng-if="count > items.length">+{{count - items.length}}</span>' +
              '</div>',

    link: function (scope, element)
    {
      var maxLines = {
        medium: 3,
        large: 6
      };

      scope.size = maxLines[scope.size] ? scope.size : 'medium';
      var limit = +scope.limit || 3;
      scope.items = [];

      if (!scope.model)
      {
        return;
      }

      // hide label if requested
      if (scope.hideLabel === true || scope.hideLabel === 'true' || scope.hideLabel === '1')
      {
        element.closest('.unesting-item-header').addClass('no-label');
      }

      if (!_.isArray(scope.model))
      {
        console.error("The <un-boxes model='my_array' /> model has to be an array");
        return;
      }

      if (_.isObject(scope.model[0]) && !scope.key)
      {
        console.error("You need the <un-boxes key='my_key' /> property for nested elements");
        return;
      }

      var items = [];
      _.each(scope.model, function (item)
      {
        var max = maxLines[scope.size];

        if (item)
        {
          if (typeof item === 'string')
          {
            items.push({
              maxLines: max,
              text: item
            });
          }

          var headline = item[scope.titleKey];

          items.push({
            maxLines: headline ? max - 1 : max,
            headline: headline,
            text: item[scope.key]
          });
        }
      });

      scope.items = items.slice(0, limit);
      scope.count = items.length;
    }
  };
});



angular.module('umbraco.directives').directive('unFigure', function ($filter)
{
  return {
    restrict: 'E',
    scope: {
      image: '=',
      text: '=',
      headline: '=',
      size: '@',
      maxLines: '@',
      hideLabel: '@'
    },

    template: '<div class="unesting-figure" ng-if="hasContent">' +
                '<un-media ng-if="image" model="image" size="{{size}}" />' +
                '<div class="unesting-figure-content">' +
                  '<span class="unesting-figure-headline" ng-if="headline">{{headline | unHtml }}</span>' +
                  '<span class="unesting-figure-text" ng-if="text" ng-style="{ \'max-height\': \'{{maxLines * 20}}px\', \'-webkit-line-clamp\': {{maxLines}} }">{{text | unHtml:800 }}</span>' +
                '</div>' +
              '</div>',

    link: function (scope, element)
    {
      scope.hasContent = !!(scope.text || scope.headline || scope.image);

      // hide label if requested
      if (scope.hideLabel === true || scope.hideLabel === 'true' || scope.hideLabel === '1')
      {
        element.closest('.unesting-item-header').toggleClass('no-label', scope.hasContent);
      }

      // calculate max lines
      scope.maxLines = +scope.maxLines || 3;
      if (scope.headline)
      {
        scope.maxLines -= 1;
      }
    }
  };
});



angular.module('umbraco.directives').directive('unConfig', function ($filter)
{
  return {
    restrict: 'E',
    scope: {
      hideLabel: '@',
      asColumns: '@'
    },

    template: '',

    link: function (scope, element)
    {
      if (scope.hideLabel === true || scope.hideLabel === 'true' || scope.hideLabel === '1')
      {
        element.closest('.unesting-item-header').addClass('no-label');
      }
      if (scope.asColumns === true || scope.asColumns === 'true' || scope.asColumns === '1')
      {
        element.closest('.unesting-item-header').addClass('as-columns');
      }
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

    var stripped = html.replace('<br>', ' ').replace('<br />', ' ').replace('<br/>', ' ').replace(/<[^>]+>/gm, ' ');

    return stripped.length > maxLength ? (stripped.substring(0, maxLength) + '...') : stripped;
  };
});