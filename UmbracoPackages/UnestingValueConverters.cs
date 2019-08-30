using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Linq;
using Umbraco.Core.Logging;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Core.PropertyEditors;
using Umbraco.Web;
using Umbraco.Web.PropertyEditors.ValueConverters;
using Umbraco.Web.PublishedCache;

namespace UmbracoPackages
{
  public class UnestingManyValueConverter : NestedContentManyValueConverter
  {
    /// <inheritdoc />
    public UnestingManyValueConverter(IPublishedSnapshotAccessor publishedSnapshotAccessor, IPublishedModelFactory publishedModelFactory, IProfilingLogger proflog) : base(publishedSnapshotAccessor, publishedModelFactory, proflog) { }

    /// <inheritdoc />
    public override object ConvertIntermediateToObject(IPublishedElement owner, IPublishedPropertyType propertyType, PropertyCacheLevel referenceCacheLevel, object inter, bool preview)
    {
      return ((IList<IPublishedElement>)base.ConvertIntermediateToObject(owner, propertyType, referenceCacheLevel, inter, preview))
        .Where(element => !element.HasValue("uNestingHide") || !element.Value<bool>("uNestingHide"));
    }
  }


  public class UnestingSingleValueConverter : NestedContentSingleValueConverter
  {
    /// <inheritdoc />
    public UnestingSingleValueConverter(IPublishedSnapshotAccessor publishedSnapshotAccessor, IPublishedModelFactory publishedModelFactory, IProfilingLogger proflog) : base(publishedSnapshotAccessor, publishedModelFactory, proflog) { }

    /// <inheritdoc />
    public override object ConvertIntermediateToObject(IPublishedElement owner, IPublishedPropertyType propertyType, PropertyCacheLevel referenceCacheLevel, object inter, bool preview)
    {
      IPublishedElement element = (IPublishedElement)base.ConvertIntermediateToObject(owner, propertyType, referenceCacheLevel, inter, preview);
      return element == null || (element.HasValue("uNestingHide") && element.Value<bool>("uNestingHide")) ? null : element;
    }
  }
}