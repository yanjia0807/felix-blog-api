import type { Schema, Struct } from '@strapi/strapi';

export interface SharedAttachment extends Struct.ComponentSchema {
  collectionName: 'components_shared_attachments';
  info: {
    displayName: 'attachment';
    icon: 'attachment';
  };
  attributes: {
    files: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    type: Schema.Attribute.Enumeration<['image', 'video', 'audio', 'file']>;
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

export interface SharedPoi extends Struct.ComponentSchema {
  collectionName: 'components_shared_pois';
  info: {
    displayName: 'Poi';
    icon: 'pinMap';
  };
  attributes: {
    adcode: Schema.Attribute.String;
    address: Schema.Attribute.String;
    adname: Schema.Attribute.String;
    citycode: Schema.Attribute.String;
    cityname: Schema.Attribute.String;
    location: Schema.Attribute.String;
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
      'shared.attachment': SharedAttachment;
      'shared.district': SharedDistrict;
      'shared.poi': SharedPoi;
    }
  }
}
