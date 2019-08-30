using Umbraco.Core.Composing;
using Umbraco.Core.PropertyEditors;
using Umbraco.Web.PropertyEditors.ValueConverters;

namespace UmbracoPackages
{
  public class UnestingComposer : IUserComposer
  {
    public void Compose(Composition composition)
    {
      composition.WithCollectionBuilder<PropertyValueConverterCollectionBuilder>()
        .Remove<NestedContentManyValueConverter>()
        .Remove<NestedContentSingleValueConverter>()
        .Append<UnestingManyValueConverter>()
        .Append<UnestingSingleValueConverter>();
    }
  }
}