using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web.Http;
using Umbraco.Core;
using Umbraco.Core.Cache;
using Umbraco.Core.Configuration;
using Umbraco.Core.Logging;
using Umbraco.Core.Models;
using Umbraco.Core.Persistence;
using Umbraco.Core.Persistence.Repositories;
using Umbraco.Core.Services;
using Umbraco.Web;
using Umbraco.Web.Editors;
using Umbraco.Web.Models.ContentEditing;
using Umbraco.Web.Mvc;
using Umbraco.Web.WebApi.Filters;
using Constants = Umbraco.Core.Constants;

namespace UmbracoPackages
{
  [PluginController("UmbracoApi")]
  [UmbracoApplicationAuthorize(Constants.Applications.Content)]
  public class UnestingController : ContentControllerBase
  {
    private IContentTypeCommonRepository ContentTypeRepository { get; set; }


    public UnestingController(IGlobalSettings globalSettings, IUmbracoContextAccessor umbracoContextAccessor, ISqlContext sqlContext, ServiceContext services, AppCaches appCaches, IProfilingLogger logger, IRuntimeState runtimeState, UmbracoHelper umbracoHelper, IContentTypeCommonRepository contentTypeRepository)
      : base(globalSettings, umbracoContextAccessor, sqlContext, services, appCaches, logger, runtimeState, umbracoHelper)
    {
      ContentTypeRepository = contentTypeRepository;
    }


    /// <summary>
    /// Return media for the specified UDIs
    /// </summary>
    /// <param name="ids"></param>
    /// <returns></returns>
    public Dictionary<Udi, string> GetMediaByUdis([FromUri]Udi[] ids)
    {
      var foundMedia = Services.MediaService.GetByIds(ids.Select(x => (x as GuidUdi).Guid));
      return foundMedia.ToDictionary(media => (Udi)media.GetUdi(), media =>
      {
        string json = media.GetValue<string>("umbracoFile");
        return JsonConvert.DeserializeObject<SrcData>(json).Src;
      });
    }


    /// <summary>
    /// Gets an empty content item for the
    /// </summary>
    /// <param name="contentTypeAlias"></param>
    /// <param name="parentId"></param>
    public Dictionary<string, ContentItemDisplay> GetScaffolds([FromUri]string[] a)
    {
      int parentId = -20;
      // string contentTypeAlias, int parentId

      var contentTypes = ContentTypeRepository.GetAllTypes().Where(x => a.Contains(x.Alias, StringComparer.InvariantCultureIgnoreCase));

      if (!contentTypes.Any())
      {
        throw new HttpResponseException(HttpStatusCode.NotFound);
      }

      return contentTypes.Select(contentType =>
      {
        var emptyContent = Services.ContentService.Create("", parentId, contentType.Alias, Security.GetUserId().ResultOr(0));
        var mapped = MapToDisplay(emptyContent);

        // TODO we need access to the translation service
        // translate the content type name if applicable
        //mapped.ContentTypeName = Services.TextService.UmbracoDictionaryTranslate(mapped.ContentTypeName);
        // if your user type doesn't have access to the Settings section it would not get this property mapped
        if (mapped.DocumentType != null)
        {
          //mapped.DocumentType.Name = Services.TextService.UmbracoDictionaryTranslate(mapped.DocumentType.Name);
        }

        //remove the listview app if it exists
        mapped.ContentApps = mapped.ContentApps.Where(x => x.Alias != "umbListView").ToList();

        return mapped;
      }).ToDictionary(x => x.ContentTypeAlias, x => x);
    }


    /// <summary>
    /// Used to map an <see cref="IContent"/> instance to a <see cref="ContentItemDisplay"/> and ensuring a language is present if required
    /// </summary>
    /// <param name="content"></param>
    /// <returns></returns>
    private ContentItemDisplay MapToDisplay(IContent content)
    {
      var display = Mapper.Map<ContentItemDisplay>(content);
      display.AllowPreview = display.AllowPreview && content.Trashed == false && content.ContentType.IsElement == false;
      return display;
    }


    class SrcData
    {
      public string Src { get; set; }
    }
  }
}
