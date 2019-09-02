﻿
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


angular.module("umbraco").controller("brothers.uNesting.DocTypePickerController", function ($scope, $controller)
{
  angular.extend(this, $controller('Umbraco.PropertyEditors.NestedContent.DocTypePickerController', { $scope: $scope }));

  $scope.aceOptions = {
    mode: "razor",
    theme: "chrome",
    showPrintMargin: false,
    autoFocus: false,
    advanced: {
      fontSize: "14px",
      enableSnippets: false,
      enableBasicAutocompletion: false,
      enableLiveAutocompletion: false,
      wrap: true
    }
  };
});

angular.module("umbraco").controller("brothers.uNesting.PropertyEditorController", [
  "$scope",
  "$interpolate",
  "$filter",
  "$timeout",
  "$http",
  "contentResource",
  "localizationService",
  "iconHelper",
  "clipboardService",
  "eventsService",
  "overlayService",
  "umbRequestHelper",

  function ($scope, $interpolate, $filter, $timeout, $http, contentResource, localizationService, iconHelper, clipboardService, eventsService, overlayService, umbRequestHelper)
  {
    var contentTypeAliases = [];
    _.each($scope.model.config.contentTypes, function (contentType)
    {
      contentTypeAliases.push(contentType.ncAlias);
    });

    _.each($scope.model.config.contentTypes, function (contentType)
    {
      contentType.nameExp = contentType.nameTemplate ? $interpolate(contentType.nameTemplate) : undefined;
    });

    $scope.nodes = [];
    $scope.currentNode = undefined;
    $scope.realCurrentNode = undefined;
    $scope.scaffolds = undefined;
    $scope.sorting = false;
    $scope.inited = false;

    $scope.minItems = $scope.model.config.minItems || 0;
    $scope.maxItems = $scope.model.config.maxItems || 0;

    if ($scope.maxItems === 0)
      $scope.maxItems = 1000;

    $scope.singleMode = $scope.minItems === 1 && $scope.maxItems === 1;
    $scope.showIcons = Object.toBoolean($scope.model.config.showIcons);
    $scope.wideMode = Object.toBoolean($scope.model.config.hideLabel);
    $scope.hasContentTypes = $scope.model.config.contentTypes.length > 0;

    $scope.labels = {};
    localizationService.localizeMany(["grid_addElement", "content_createEmpty"]).then(function (data)
    {
      $scope.labels.grid_addElement = data[0];
      $scope.labels.content_createEmpty = data[1];
    });

    // helper to force the current form into the dirty state
    $scope.setDirty = function ()
    {
      if ($scope.propertyForm)
      {
        $scope.propertyForm.$setDirty();
      }
    };

    $scope.addNode = function (alias)
    {
      var scaffold = $scope.getScaffold(alias);

      var newNode = createNode(scaffold, null);

      $scope.currentNode = newNode;
      $scope.setDirty();
    };

    $scope.openNodeTypePicker = function ($event)
    {
      if ($scope.nodes.length >= $scope.maxItems)
      {
        return;
      }

      $scope.overlayMenu = {
        show: false,
        style: {},
        filter: true, // $scope.scaffolds.length > 12 ? true : false,
        orderBy: "$index",
        view: "/App_Plugins/brothers.uNesting/uNesting.picker.html",
        event: $event,
        clickPasteItem: function (item)
        {
          $scope.pasteFromClipboard(item.data);
          $scope.overlayMenu.show = false;
          $scope.overlayMenu = null;
        },
        submit: function (model)
        {
          if (model && model.selectedItem)
          {
            $scope.addNode(model.selectedItem.alias);
          }
          $scope.overlayMenu.show = false;
          $scope.overlayMenu = null;
        },
        close: function ()
        {
          $scope.overlayMenu.show = false;
          $scope.overlayMenu = null;
        }
      };

      // this could be used for future limiting on node types
      $scope.overlayMenu.availableItems = [];
      _.each($scope.scaffolds, function (scaffold)
      {
        $scope.overlayMenu.availableItems.push({
          scaffold: scaffold,
          alias: scaffold.contentTypeAlias,
          name: scaffold.contentTypeName,
          description: scaffold.documentType.description,
          icon: iconHelper.convertFromLegacyIcon(scaffold.icon)
        });
      });

      if ($scope.overlayMenu.availableItems.length === 0)
      {
        return;
      }

      $scope.overlayMenu.size = "medium"; // $scope.overlayMenu.availableItems.length > 6 ? "medium" : "small";

      $scope.overlayMenu.pasteItems = [];
      var availableNodesForPaste = clipboardService.retriveDataOfType("elementType", contentTypeAliases);
      _.each(availableNodesForPaste, function (node)
      {
        $scope.overlayMenu.pasteItems.push({
          alias: node.contentTypeAlias,
          name: node.name, //contentTypeName
          data: node,
          icon: iconHelper.convertFromLegacyIcon(node.icon)
        });
      });

      $scope.overlayMenu.title = $scope.overlayMenu.pasteItems.length > 0 ? $scope.labels.grid_addElement : $scope.labels.content_createEmpty;

      $scope.overlayMenu.clickClearPaste = function ($event)
      {
        $event.stopPropagation();
        $event.preventDefault();
        clipboardService.clearEntriesOfType("elementType", contentTypeAliases);
        $scope.overlayMenu.pasteItems = [];// This dialog is not connected via the clipboardService events, so we need to update manually.
      };

      if ($scope.overlayMenu.availableItems.length === 1 && $scope.overlayMenu.pasteItems.length === 0)
      {
        // only one scaffold type - no need to display the picker
        $scope.addNode($scope.scaffolds[0].contentTypeAlias);
        return;
      }

      $scope.overlayMenu.show = true;
    };

    $scope.editNode = function (idx)
    {
      if ($scope.currentNode && $scope.currentNode.key === $scope.nodes[idx].key)
      {
        $scope.currentNode = undefined;
      } else
      {
        $scope.currentNode = $scope.nodes[idx];
      }
    };

    $scope.deleteNode = function (idx)
    {
      if ($scope.nodes.length > $scope.model.config.minItems)
      {
        $scope.nodes.splice(idx, 1);
        $scope.setDirty();
        updateModel();
      }
    };
    $scope.requestDeleteNode = function (idx)
    {
      if ($scope.model.config.confirmDeletes === true)
      {
        localizationService.localizeMany(["content_nestedContentDeleteItem", "general_delete", "general_cancel", "contentTypeEditor_yesDelete"]).then(function (data)
        {
          const overlay = {
            title: data[1],
            content: data[0],
            closeButtonLabel: data[2],
            submitButtonLabel: data[3],
            submitButtonStyle: "danger",
            close: function ()
            {
              overlayService.close();
            },
            submit: function ()
            {
              $scope.deleteNode(idx);
              overlayService.close();
            }
          };

          overlayService.open(overlay);
        });
      } else
      {
        $scope.deleteNode(idx);
      }
    };

    $scope.getName = function (idx)
    {

      var name = "";

      if ($scope.model.value[idx])
      {

        var contentType = $scope.getContentTypeConfig($scope.model.value[idx].ncContentTypeAlias);

        if (contentType != null)
        {
          // first try getting a name using the configured label template
          if (contentType.nameExp)
          {
            // Run the expression against the stored dictionary value, NOT the node object
            var item = $scope.model.value[idx];

            // Add a temporary index property
            item["$index"] = (idx + 1);

            var newName = contentType.nameExp(item);
            if (newName && (newName = $.trim(newName)))
            {
              name = newName;
            }

            // Delete the index property as we don't want to persist it
            delete item["$index"];
          }

          // if we still do not have a name and we have multiple content types to choose from, use the content type name (same as is shown in the content type picker)
          if (!name && $scope.scaffolds.length > 1)
          {
            var scaffold = $scope.getScaffold(contentType.ncAlias);
            if (scaffold)
            {
              name = scaffold.contentTypeName;
            }
          }
        }

      }

      if (!name)
      {
        name = "Item " + (idx + 1);
      }

      // Update the nodes actual name value
      if ($scope.nodes[idx].name !== name)
      {
        $scope.nodes[idx].name = name;
      }

      return name;
    };

    $scope.getIcon = function (idx)
    {
      var scaffold = $scope.getScaffold($scope.model.value[idx].ncContentTypeAlias);
      return scaffold && scaffold.icon ? iconHelper.convertFromLegacyIcon(scaffold.icon) : "icon-folder";
    }

    $scope.sortableOptions = {
      axis: "y",
      cursor: "move",
      handle: '.umb-nested-content__header-bar',
      distance: 10,
      opacity: 0.7,
      tolerance: "pointer",
      scroll: true,
      start: function (ev, ui)
      {
        updateModel();
        // Yea, yea, we shouldn't modify the dom, sue me
        $("#umb-nested-content--" + $scope.model.id + " .umb-rte textarea").each(function ()
        {
          tinymce.execCommand("mceRemoveEditor", false, $(this).attr("id"));
          $(this).css("visibility", "hidden");
        });
        $scope.$apply(function ()
        {
          $scope.sorting = true;
        });
      },
      update: function (ev, ui)
      {
        $scope.setDirty();
      },
      stop: function (ev, ui)
      {
        $("#umb-nested-content--" + $scope.model.id + " .umb-rte textarea").each(function ()
        {
          tinymce.execCommand("mceAddEditor", true, $(this).attr("id"));
          $(this).css("visibility", "visible");
        });
        $scope.$apply(function ()
        {
          $scope.sorting = false;
          updateModel();
        });
      }
    };

    $scope.getScaffold = function (alias)
    {
      return _.find($scope.scaffolds, function (scaffold)
      {
        return scaffold.contentTypeAlias === alias;
      });
    }

    $scope.getContentTypeConfig = function (alias)
    {
      return _.find($scope.model.config.contentTypes, function (contentType)
      {
        return contentType.ncAlias === alias;
      });
    }

    $scope.showCopy = clipboardService.isSupported();

    $scope.showPaste = false;

    $scope.clickCopy = function ($event, node)
    {

      syncCurrentNode();

      clipboardService.copy("elementType", node.contentTypeAlias, node);
      $event.stopPropagation();
    }

    $scope.pasteFromClipboard = function (newNode)
    {

      if (newNode === undefined)
      {
        return;
      }

      // generate a new key.
      newNode.key = String.CreateGuid();

      $scope.nodes.push(newNode);
      $scope.setDirty();
      //updateModel();// done by setting current node...

      $scope.currentNode = newNode;
    }

    function checkAbilityToPasteContent()
    {
      $scope.showPaste = clipboardService.hasEntriesOfType("elementType", contentTypeAliases);
    }

    eventsService.on("clipboardService.storageUpdate", checkAbilityToPasteContent);

    var notSupported = [
      "Umbraco.Tags",
      "Umbraco.UploadField",
      "Umbraco.ImageCropper"
    ];

    // Initialize
    var scaffoldsLoaded = 0;
    $scope.scaffolds = [];
    _.each($scope.model.config.contentTypes, function (contentType)
    {
      contentResource.getScaffold(-20, contentType.ncAlias).then(function (scaffold)
      {
        // make sure it's an element type before allowing the user to create new ones
        if (scaffold.isElement)
        {
          // remove all tabs except the specified tab
          //var tabs = scaffold.variants[0].tabs;
          //var tab = _.find(tabs, function (tab)
          //{
          //  return tab.id !== 0 && (tab.alias.toLowerCase() === contentType.ncTabAlias.toLowerCase() || contentType.ncTabAlias === "");
          //});
          //scaffold.variants[0].tabs = [];
          //if (tab)
          //{
          //  scaffold.variants[0].tabs.push(tab);

          //  angular.forEach(tab.properties,
          //    function (property)
          //    {
          //      if (_.find(notSupported, function (x) { return x === property.editor; }))
          //      {
          //        property.notSupported = true;
          //        // TODO: Not supported message to be replaced with 'content_nestedContentEditorNotSupported' dictionary key. Currently not possible due to async/timing quirk.
          //        property.notSupportedMessage = "Property " + property.label + " uses editor " + property.editor + " which is not supported by Nested Content.";
          //      }
          //    });
          //}

          // Store the scaffold object
          $scope.scaffolds.push(scaffold);
        }

        scaffoldsLoaded++;
        initIfAllScaffoldsHaveLoaded();
      }, function (error)
        {
          scaffoldsLoaded++;
          initIfAllScaffoldsHaveLoaded();
        });
    });

    var initIfAllScaffoldsHaveLoaded = function ()
    {
      // Initialize when all scaffolds have loaded
      if ($scope.model.config.contentTypes.length === scaffoldsLoaded)
      {
        // Because we're loading the scaffolds async one at a time, we need to
        // sort them explicitly according to the sort order defined by the data type.
        contentTypeAliases = [];
        _.each($scope.model.config.contentTypes, function (contentType)
        {
          contentTypeAliases.push(contentType.ncAlias);
        });
        $scope.scaffolds = $filter("orderBy")($scope.scaffolds, function (s)
        {
          return contentTypeAliases.indexOf(s.contentTypeAlias);
        });

        // Convert stored nodes
        if ($scope.model.value)
        {
          for (var i = 0; i < $scope.model.value.length; i++)
          {
            var item = $scope.model.value[i];
            var scaffold = $scope.getScaffold(item.ncContentTypeAlias);
            if (scaffold == null)
            {
              // No such scaffold - the content type might have been deleted. We need to skip it.
              continue;
            }
            createNode(scaffold, item);
          }
        }

        // Enforce min items
        if ($scope.nodes.length < $scope.model.config.minItems)
        {
          for (var i = $scope.nodes.length; i < $scope.model.config.minItems; i++)
          {
            $scope.addNode($scope.scaffolds[0].contentTypeAlias);
          }
        }

        // If there is only one item, set it as current node
        if ($scope.singleMode || ($scope.nodes.length === 1 && $scope.maxItems === 1))
        {
          $scope.currentNode = $scope.nodes[0];
        }

        $scope.inited = true;

        checkAbilityToPasteContent();
      }
    }

    function createNode(scaffold, fromNcEntry)
    {
      var node = angular.copy(scaffold);

      node.key = fromNcEntry && fromNcEntry.key ? fromNcEntry.key : String.CreateGuid();

      var variant = node.variants[0];

      for (var t = 0; t < variant.tabs.length; t++)
      {
        var tab = variant.tabs[t];

        for (var p = 0; p < tab.properties.length; p++)
        {
          var prop = tab.properties[p];

          prop.propertyAlias = prop.alias;
          prop.alias = $scope.model.alias + "___" + prop.alias;
          // Force validation to occur server side as this is the
          // only way we can have consistency between mandatory and
          // regex validation messages. Not ideal, but it works.
          prop.validation = {
            mandatory: false,
            pattern: ""
          };

          if (fromNcEntry && fromNcEntry[prop.propertyAlias])
          {
            prop.value = fromNcEntry[prop.propertyAlias];
          }
        }
      }

      $scope.nodes.push(node);

      return node;
    }

    function convertNodeIntoNCEntry(node)
    {
      var obj = {
        key: node.key,
        name: node.name,
        ncContentTypeAlias: node.contentTypeAlias
      };
      for (var t = 0; t < node.variants[0].tabs.length; t++)
      {
        var tab = node.variants[0].tabs[t];
        for (var p = 0; p < tab.properties.length; p++)
        {
          var prop = tab.properties[p];
          if (typeof prop.value !== "function")
          {
            obj[prop.propertyAlias] = prop.value;
          }
        }
      }
      return obj;
    }

    function syncCurrentNode()
    {
      if ($scope.realCurrentNode)
      {
        $scope.$broadcast("ncSyncVal", { key: $scope.realCurrentNode.key });
      }
    }

    function updateModel()
    {
      syncCurrentNode();

      if ($scope.inited)
      {
        var newValues = [];
        for (var i = 0; i < $scope.nodes.length; i++)
        {
          newValues.push(convertNodeIntoNCEntry($scope.nodes[i]));
        }
        $scope.model.value = newValues;
      }
    }

    $scope.$watch("currentNode", function (newVal)
    {
      updateModel();
      $scope.realCurrentNode = newVal;
    });

    var unsubscribe = $scope.$on("formSubmitting", function (ev, args)
    {
      updateModel();
    });

    $scope.$on("$destroy", function ()
    {
      unsubscribe();
    });

    $scope.clickHide = function ($event, node, $index)
    {
      $event.preventDefault();
      $event.stopPropagation();

      var tab = _.find(node.variants[0].tabs, function (tab)
      {
        var alias = tab.alias.toLowerCase();
        return tab.id !== 0 && alias !== 'unestingsettings' && (!$scope.tabAlias || alias === $scope.tabAlias.toLowerCase());
      });

      var property = _.find(tab.properties, function (prop)
      {
        return prop.propertyAlias.toLowerCase() === 'unestinghide';
      });

      if (property)
      {
        property.value = property.value === '1' ? '0' : '1';
        $scope.setDirty();

        if ($scope.inited)
        {
          $scope.model.value[$index] = convertNodeIntoNCEntry(node);
        }
      }
    };

    $scope.canHide = function (item)
    {
      return typeof item['uNestingHide'] !== 'undefined';
    };

    $scope.isHidden = function (item, node)
    {
      return item['uNestingHide'] === '1';
    };
  }
]);





angular.module("umbraco").controller("brothers.uNesting.ItemPickerOverlay", function ($scope, localizationService)
{

  function onInit()
  {
    $scope.model.hideSubmitButton = true;

    console.info($scope.model);

    if (!$scope.model.title)
    {
      localizationService.localize("defaultdialogs_selectItem").then(function (value)
      {
        $scope.model.title = value;
      });
    }

    if (!$scope.model.orderBy)
    {
      $scope.model.orderBy = "name";
    }
  }

  $scope.selectItem = function (item)
  {
    $scope.model.selectedItem = item;
    $scope.submitForm($scope.model);
  };

  onInit();

});
