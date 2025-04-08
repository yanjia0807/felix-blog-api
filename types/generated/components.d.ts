import type { Schema, Struct } from '@strapi/strapi';

export interface SharedAttachmentExtra extends Struct.ComponentSchema {
  collectionName: 'components_shared_attachment_extras';
  info: {
    description: '';
    displayName: 'AttachmentExtra';
  };
  attributes: {
    attachment: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    thumbnail: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedDistrict extends Struct.ComponentSchema {
  collectionName: 'components_shared_districts';
  info: {
    displayName: 'District';
    icon: 'pinMap';
  };
  attributes: {
    cityCode: Schema.Attribute.String;
    cityName: Schema.Attribute.String;
    districtCode: Schema.Attribute.String;
    districtName: Schema.Attribute.String;
    provinceCode: Schema.Attribute.String;
    provinceName: Schema.Attribute.String;
  };
}

export interface SharedLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_links';
  info: {
    displayName: 'Link';
  };
  attributes: {
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    src: Schema.Attribute.String;
  };
}

export interface SharedPoi extends Struct.ComponentSchema {
  collectionName: 'components_shared_pois';
  info: {
    description: '';
    displayName: 'Poi';
    icon: 'pinMap';
  };
  attributes: {
    adcode: Schema.Attribute.String;
    address: Schema.Attribute.String;
    adname: Schema.Attribute.String;
    citycode: Schema.Attribute.String;
    cityname: Schema.Attribute.String;
    latitude: Schema.Attribute.String;
    longitude: Schema.Attribute.String;
    name: Schema.Attribute.String;
    pcode: Schema.Attribute.String;
    pname: Schema.Attribute.String;
    type: Schema.Attribute.String;
    typecode: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.attachment-extra': SharedAttachmentExtra;
      'shared.district': SharedDistrict;
      'shared.link': SharedLink;
      'shared.poi': SharedPoi;
    }
  }
}
