
angular.module("umbraco").controller("brothers.uNesting.PropertyEditorController", function ($scope, $controller, $http)
{
  angular.extend(this, $controller('Umbraco.PropertyEditors.NestedContent.PropertyEditorController', { $scope: $scope }));

  var elementsConfig = {};

  var init = function ()
  {
    $http.get("/App_Plugins/brothers.uNesting/elements.json").then(function (res)
    {
      elementsConfig = res.data;

      _.each($scope.nodes, function (node, idx)
      {
        node.uNestingContent = getContent(node, $scope.model.value[idx], elementsConfig[node.contentTypeAlias]);
      });
    });
  };

  $scope.$watch("inited", function (newVal)
  {
    if (newVal)
    {
      init();
    }
  });

  var getContent = function (node, item, config)
  {
    if (!item)
    {
      return '';
    }
    if (!config)
    {
      return node.documentType.description;
    }

    var lines = [];

    _.each(config, function (type, alias)
    {
      var value = item[alias];
      if (value)
      {
        if (type === 'text')
        {
          lines.push(stripHtml(value));
        }
        if (type === 'url')
        {
          lines.push(value[0].url);
        }
      }
    });

    if (lines.length < 1)
    {
      return node.documentType.description;
    }
    else
    {
      return lines.join('<br>');
    }
  };


  var stripHtml = function (html)
  {
    if (!html)
    {
      return '';
    }

    var stripped = html.replace('<br>', ' ').replace('<br />', ' ').replace('<br/>', ' ').replace(/<[^>]+>/gm, '');

    return stripped.length > 120 ? (stripped.substring(0, 120) + '...') : stripped;
  };

  //$scope.getView = function (node, idx)
  //{
  //  if ($scope.model.value[idx])
  //  {
  //    var contentType = $scope.getContentTypeConfig($scope.model.value[idx].ncContentTypeAlias);

  //    if (contentType !== null && contentType.nameExp)
  //    {
  //      // Run the expression against the stored dictionary value, NOT the node object
  //      var item = $scope.model.value[idx];
  //      var newName = contentType.nameExp(item);

  //      if (newName && (newName = $.trim(newName)))
  //      {
  //        return newName;
  //      }
  //    }
  //  }
  //  return node.documentType.description || 'Enter data ...';
  //};
});