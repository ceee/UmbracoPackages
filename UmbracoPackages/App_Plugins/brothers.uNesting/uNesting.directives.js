

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
        var url = $http.get(Umbraco.Sys.ServerVariables.umbracoSettings.umbracoPath + "/backoffice/UmbracoApi/Unesting/GetMediaByUdis?" + query);

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



angular.module("umbraco.directives").directive('uNestingContentEditor', [

  function ()
  {
    var link = function ($scope)
    {
      // Clone the model because some property editors
      // do weird things like updating and config values
      // so we want to ensure we start from a fresh every
      // time, we'll just sync the value back when we need to
      $scope.model = angular.copy($scope.ngModel);
      $scope.nodeContext = $scope.model;

      // Find the selected tab
      var selectedTab = $scope.model.variants[0].tabs[0];

      if ($scope.tabAlias)
      {
        angular.forEach($scope.model.variants[0].tabs, function (tab)
        {
          if (tab.alias.toLowerCase() === $scope.tabAlias.toLowerCase())
          {
            selectedTab = tab;
            return;
          }
        });
      }

      $scope.tabs = $scope.model.variants[0].tabs;

      var contentTab = _.find($scope.tabs, function (tab)
      {
        var alias = tab.alias.toLowerCase();
        return tab.id !== 0 && alias !== 'unestingsettings' && (!$scope.tabAlias || alias === $scope.tabAlias.toLowerCase());
      });

      $scope.contentProperties = _.filter(contentTab.properties, function (prop)
      {
        return prop.propertyAlias.toLowerCase() !== 'unestinghide';
      });

      //var settingsTab = _.find($scope.tabs, function (tab)
      //{
      //  var alias = tab.alias.toLowerCase();
      //  return tab.id !== 0 && alias === 'unestingsettings';
      //});

      //$scope.settingsProperties = settingsTab ? settingsTab.properties : [];
      $scope.settingsProperties = [];

      // Listen for sync request
      var unsubscribe = $scope.$on("ncSyncVal", function (ev, args)
      {
        if (args.key === $scope.model.key)
        {
          // Tell inner controls we are submitting
          $scope.$broadcast("formSubmitting", { scope: $scope });

          // Sync the values back
          angular.forEach($scope.ngModel.variants[0].tabs, function (tab)
          {
            if (tab.alias.toLowerCase() === selectedTab.alias.toLowerCase())
            {

              var localPropsMap = selectedTab.properties.reduce(function (map, obj)
              {
                map[obj.alias] = obj;
                return map;
              }, {});

              angular.forEach(tab.properties, function (prop)
              {
                if (localPropsMap.hasOwnProperty(prop.alias))
                {
                  prop.value = localPropsMap[prop.alias].value;
                }
              });

            }
          });
        }
      });

      $scope.$on('$destroy', function ()
      {
        unsubscribe();
      });
    };

    return {
      restrict: "E",
      replace: true,
      templateUrl: Umbraco.Sys.ServerVariables.umbracoSettings.umbracoPath + "/views/propertyeditors/nestedcontent/nestedcontent.editor.html",
      scope: {
        ngModel: '=',
        tabAlias: '='
      },
      link: link
    };

  }
]);