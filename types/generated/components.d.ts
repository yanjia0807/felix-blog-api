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

export interface SharedFileInfo extends Struct.ComponentSchema {
  collectionName: 'components_shared_file_infos';
  info: {
    displayName: 'FileInfo';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    fileInfo: Schema.Attribute.JSON;
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
      'shared.attachment-extra': SharedAttachmentExtra;
      'shared.district': SharedDistrict;
      'shared.file-info': SharedFileInfo;
      'shared.poi': SharedPoi;
    }
  }
}
