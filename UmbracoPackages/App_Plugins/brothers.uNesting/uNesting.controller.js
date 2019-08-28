
angular.module("umbraco").controller("brothers.uNesting.PropertyEditorController", function ($scope, $controller)
{
  angular.extend(this, $controller('Umbraco.PropertyEditors.NestedContent.PropertyEditorController', { $scope: $scope }));

  $scope.getView = function (node, idx)
  {
    if ($scope.model.value[idx])
    {
      var contentType = $scope.getContentTypeConfig($scope.model.value[idx].ncContentTypeAlias);

      if (contentType !== null && contentType.nameExp)
      {
        // Run the expression against the stored dictionary value, NOT the node object
        var item = $scope.model.value[idx];
        var newName = contentType.nameExp(item);

        if (newName && (newName = $.trim(newName)))
        {
          return newName;
        }
      }
    }
    return node.documentType.description || 'Enter data ...';
  };
});