using Newtonsoft.Json;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using Umbraco.Core;
using Umbraco.Core.Cache;
using Umbraco.Core.Configuration;
using Umbraco.Core.Logging;
using Umbraco.Core.Persistence;
using Umbraco.Core.Services;
using Umbraco.Web;
using Umbraco.Web.Editors;
using Umbraco.Web.Mvc;
using Umbraco.Web.WebApi.Filters;
using Constants = Umbraco.Core.Constants;

namespace UmbracoPackages
{
  /// <remarks>
  /// This controller is decorated with the UmbracoApplicationAuthorizeAttribute which means that any user requesting
  /// access to ALL of the methods on this controller will need access to the media application.
  /// </remarks>
  [PluginController("UmbracoApi")]
  [UmbracoApplicationAuthorize(Constants.Applications.Media)]
  public class MediaExtendedController : ContentControllerBase
  {
    public MediaExtendedController(IGlobalSettings globalSettings, IUmbracoContextAccessor umbracoContextAccessor, ISqlContext sqlContext, ServiceContext services, AppCaches appCaches, IProfilingLogger logger, IRuntimeState runtimeState, UmbracoHelper umbracoHelper)
      : base(globalSettings, umbracoContextAccessor, sqlContext, services, appCaches, logger, runtimeState, umbracoHelper) { }


    /// <summary>
    /// Return media for the specified UDIs
    /// </summary>
    /// <param name="ids"></param>
    /// <returns></returns>
    public Dictionary<Udi, string> GetByUdis([FromUri]Udi[] ids)
    {
      var foundMedia = Services.MediaService.GetByIds(ids.Select(x => (x as GuidUdi).Guid));
      return foundMedia.ToDictionary(media => (Udi)media.GetUdi(), media =>
      {
        string json = media.GetValue<string>("umbracoFile");
        return JsonConvert.DeserializeObject<SrcData>(json).Src;
      });
    }


    class SrcData
    {
      public string Src { get; set; }
    }
  }
}
