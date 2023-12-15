// Errors
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

// SAML metadata

interface Element {
}

// <complexType name="localizedNameType">
//     <simpleContent>
//         <extension base="string">
//             <attribute ref="xml:lang" use="required"/>
//         </extension>
//     </simpleContent>
// </complexType>
// <complexType name="localizedURIType">
//     <simpleContent>
//         <extension base="anyURI">
//             <attribute ref="xml:lang" use="required"/>
//         </extension>
//     </simpleContent>
// </complexType>

export namespace Attributes {
  export interface Localized {
    lang: string; // required
  }
}

export class Localized implements Element, Attributes.Localized {
  content: string | undefined; // required
  lang: string; // required

  constructor(attrs: Attributes.Localized) {
    this.lang = attrs.lang;
  }
};

// <complexType name="AttributeType">
//     <sequence>
//         <element ref="saml:AttributeValue" minOccurs="0" maxOccurs="unbounded"/>
//     </sequence>
//     <attribute name="Name" type="string" use="required"/>
//     <attribute name="NameFormat" type="anyURI" use="optional"/>
//     <attribute name="FriendlyName" type="string" use="optional"/>
//     <anyAttribute namespace="##other" processContents="lax"/>
// </complexType>
// <element name="AttributeValue" type="anyType" nillable="true"/>

export namespace Attributes {
  export interface Attribute {
    name: string; // required
    nameFormat: string | null;
    friendlyName: string | null;
  }
}

export class Attribute implements Element, Attributes.Attribute  {
  values: string[] = [];

  name: string; // required
  nameFormat: string | null;
  friendlyName: string | null;

  constructor(attrs: Attributes.Attribute) {
    this.name = attrs.name;
    this.nameFormat = attrs.nameFormat;
    this.friendlyName = attrs.friendlyName;
  }
}

// <complexType name="EndpointType">
//     <sequence>
//         <any namespace="##other" processContents="lax" minOccurs="0" maxOccurs="unbounded"/>
//     </sequence>
//     <attribute name="Binding" type="anyURI" use="required"/>
//     <attribute name="Location" type="anyURI" use="required"/>
//     <attribute name="ResponseLocation" type="anyURI" use="optional"/>
//     <anyAttribute namespace="##other" processContents="lax"/>
// </complexType>

export namespace Attributes {
  export interface Endpoint {
    binding: string; // required
    location: string; // required
    responseLocation: string | null;
  }
}

export class Endpoint implements Element, Attributes.Endpoint  {
  binding: string; // required
  location: string; // required
  responseLocation: string | null;

  constructor(attrs: Attributes.Endpoint) {
    this.binding = attrs.binding;
    this.location = attrs.location;
    this.responseLocation = attrs.responseLocation;
  }
}

// <complexType name="IndexedEndpointType">
//     <complexContent>
//         <extension base="md:EndpointType">
//             <attribute name="index" type="unsignedShort" use="required"/>
//             <attribute name="isDefault" type="boolean" use="optional"/>
//         </extension>
//     </complexContent>
// </complexType>

export namespace Attributes {
  export interface IndexedEndpoint extends Attributes.Endpoint {
    index: number;
    isDefault: boolean | null;
  }
}

export class IndexedEndpoint extends Endpoint implements Element, Attributes.IndexedEndpoint {
  index: number;
  isDefault: boolean | null;

  constructor(attrs: Attributes.IndexedEndpoint) {
    super(attrs);
    this.index = attrs.index;
    this.isDefault = attrs.isDefault;
  }
}

// <complexType name="KeyDescriptorType">
//     <sequence>
//         <element ref="ds:KeyInfo"/>
//         <element ref="md:EncryptionMethod" minOccurs="0" maxOccurs="unbounded"/>
//     </sequence>
//     <attribute name="use" type="md:KeyTypes" use="optional"/>
// </complexType>
// <simpleType name="KeyTypes">
//     <restriction base="string">
//         <enumeration value="encryption"/>
//         <enumeration value="signing"/>
//     </restriction>
// </simpleType>
// <element name="EncryptionMethod" type="xenc:EncryptionMethodType"/>

export type KeyType = 'encryption' | 'signing';

export namespace Attributes {
  export interface Key {
    use: KeyType | null;
  }
}

export class Key implements Element, Attributes.Key  {
  certificates: string[] = [];
  //EncryptionMethod

  use: KeyType | null;

  constructor(attrs: Attributes.Key) {
    this.use = attrs.use;
  }

  validate() {
    return this.certificates.length > 0 &&
      this.certificates.every(x => x !== '');
  }
}

// <complexType name="EntitiesDescriptorType">
//     <sequence>
//         <element ref="ds:Signature" minOccurs="0"/>
//         <element ref="md:Extensions" minOccurs="0"/>
//         <choice minOccurs="1" maxOccurs="unbounded">
//             <element ref="md:EntityDescriptor"/>
//             <element ref="md:EntitiesDescriptor"/>
//         </choice>
//     </sequence>
//     <attribute name="validUntil" type="dateTime" use="optional"/>
//     <attribute name="cacheDuration" type="duration" use="optional"/>
//     <attribute name="ID" type="ID" use="optional"/>
//     <attribute name="Name" type="string" use="optional"/>
// </complexType>

export namespace Attributes {
  export interface EntitiesDescriptor {
    validUntil: string | null; // Date
    cacheDuration: string | null; // Duration
    // ID
    name: string | null;
  }
}

export class EntitiesDescriptor implements Element, Attributes.EntitiesDescriptor {
  // Signature
  // Extensions
  entities: (EntityDescriptor | EntitiesDescriptor)[] = []; // required

  validUntil: string | null; // Date
  cacheDuration: string | null; // Duration
  // ID
  name: string | null;

  constructor(attrs: Attributes.EntitiesDescriptor) {
    this.validUntil = attrs.validUntil;
    this.cacheDuration = attrs.cacheDuration;
    this.name = attrs.name;
  }
}

// <complexType name="EntityDescriptorType">
//     <sequence>
//         <element ref="ds:Signature" minOccurs="0"/>
//         <element ref="md:Extensions" minOccurs="0"/>
//         <choice>
//             <choice maxOccurs="unbounded">
//                 <element ref="md:RoleDescriptor"/>
//                 <element ref="md:IDPSSODescriptor"/>
//                 <element ref="md:SPSSODescriptor"/>
//                 <element ref="md:AuthnAuthorityDescriptor"/>
//                 <element ref="md:AttributeAuthorityDescriptor"/>
//                 <element ref="md:PDPDescriptor"/>
//             </choice>
//             <element ref="md:AffiliationDescriptor"/>
//         </choice>
//         <element ref="md:Organization" minOccurs="0"/>
//         <element ref="md:ContactPerson" minOccurs="0" maxOccurs="unbounded"/>
//         <element ref="md:AdditionalMetadataLocation" minOccurs="0" maxOccurs="unbounded"/>
//     </sequence>
//     <attribute name="entityID" type="md:entityIDType" use="required"/>
//     <attribute name="validUntil" type="dateTime" use="optional"/>
//     <attribute name="cacheDuration" type="duration" use="optional"/>
//     <attribute name="ID" type="ID" use="optional"/>
//     <anyAttribute namespace="##other" processContents="lax"/>
// </complexType>

export namespace Attributes {
  export interface EntityDescriptor {
    entityID: string; //required
    validUntil: string | null; // Date
    cacheDuration: string | null; // Duration
    // ID
  }
}

export class EntityDescriptor implements Element, Attributes.EntityDescriptor {
  // Signature
  // Extensions
  // RoleDescriptor
  // AuthnAuthorityDescriptor
  // AttributeAuthorityDescriptor
  // PDPDescriptor
  // AffiliationDescriptor
  idps: IDPSSO[] = [];
  sps: SPSSO[] = [];
  organization: Organization | null = null;
  contactPersons: ContactPerson[] = [];
  // AdditionalMetadataLocation

  entityID: string; //required
  validUntil: string | null; // Date
  cacheDuration: string | null; // Duration
  // ID

  constructor(attrs: Attributes.EntityDescriptor) {
    this.entityID = attrs.entityID;
    this.validUntil = attrs.validUntil;
    this.cacheDuration = attrs.cacheDuration;
  }
}

// <complexType name="OrganizationType">
//     <sequence>
//         <element ref="md:Extensions" minOccurs="0"/>
//         <element ref="md:OrganizationName" maxOccurs="unbounded"/>
//         <element ref="md:OrganizationDisplayName" maxOccurs="unbounded"/>
//         <element ref="md:OrganizationURL" maxOccurs="unbounded"/>
//     </sequence>
//     <anyAttribute namespace="##other" processContents="lax"/>
// </complexType>
// <element name="OrganizationName" type="md:localizedNameType"/>
// <element name="OrganizationDisplayName" type="md:localizedNameType"/>
// <element name="OrganizationURL" type="md:localizedURIType"/>

export namespace Attributes {
  export interface Organization {}
}

export class Organization implements Element, Attributes.Organization {
  // Extensions
  organizationName: Localized[] = [];
  organizationDisplayName: Localized[] = [];
  organizationURL: Localized[] = [];

  constructor(attrs: Attributes.Organization) {}
}

// <simpleType name="ContactTypeType">
//     <restriction base="string">
//         <enumeration value="technical"/>
//         <enumeration value="support"/>
//         <enumeration value="administrative"/>
//         <enumeration value="billing"/>
//         <enumeration value="other"/>
//     </restriction>
// </simpleType>

export type ContactType = 'technical' | 'support' | 'administrative' | 'billing' | 'other';

// <element name="ContactPerson" type="md:ContactType"/>
// <complexType name="ContactType">
//     <sequence>
//         <element ref="md:Extensions" minOccurs="0"/>
//         <element ref="md:Company" minOccurs="0"/>
//         <element ref="md:GivenName" minOccurs="0"/>
//         <element ref="md:SurName" minOccurs="0"/>
//         <element ref="md:EmailAddress" minOccurs="0" maxOccurs="unbounded"/>
//         <element ref="md:TelephoneNumber" minOccurs="0" maxOccurs="unbounded"/>
//     </sequence>
//     <attribute name="contactType" type="md:ContactTypeType" use="required"/>
//     <anyAttribute namespace="##other" processContents="lax"/>
// </complexType>
// <element name="Company" type="string"/>
// <element name="GivenName" type="string"/>
// <element name="SurName" type="string"/>
// <element name="EmailAddress" type="anyURI"/>
// <element name="TelephoneNumber" type="string"/>

export namespace Attributes {
  export interface ContactPerson {
    contactType: ContactType; // required
  }
}

export class ContactPerson implements Element, Attributes.ContactPerson {
  // Extensions
  company: string | null = null;
  givenName: string | null = null;
  surName: string | null = null;
  emailAddresses: string[] = [];
  telephoneNumbers: string[] = [];

  contactType: ContactType; // required

  constructor(attrs: Attributes.ContactPerson) {
    this.contactType = attrs.contactType;
  }

  validate() {
    return true;
  }
}

// <complexType name="RoleDescriptorType" abstract="true">
//     <sequence>
//         <element ref="ds:Signature" minOccurs="0"/>
//         <element ref="md:Extensions" minOccurs="0"/>
//         <element ref="md:KeyDescriptor" minOccurs="0" maxOccurs="unbounded"/>
//         <element ref="md:Organization" minOccurs="0"/>
//         <element ref="md:ContactPerson" minOccurs="0" maxOccurs="unbounded"/>
//     </sequence>
//     <attribute name="ID" type="ID" use="optional"/>
//     <attribute name="validUntil" type="dateTime" use="optional"/>
//     <attribute name="cacheDuration" type="duration" use="optional"/>
//     <attribute name="protocolSupportEnumeration" type="md:anyURIListType" use="required"/>
//     <attribute name="errorURL" type="anyURI" use="optional"/>
//     <anyAttribute namespace="##other" processContents="lax"/>
// </complexType>

export namespace Attributes {
  export interface Role {
    // ID
    validUntil: string | null; // Date
    cacheDuration: string | null; // Duration
    protocolSupportEnumeration: string[];
    errorURL: string | null;
  }
}

export abstract class Role implements Element, Attributes.Role {
    // Signature
    // Extensions
    keys: Key[] = [];
    organization: Organization | null = null;
    contactPersons: ContactPerson[] = [];

    // ID
    validUntil: string | null; // Date
    cacheDuration: string | null; // Duration
    protocolSupportEnumeration: string[];
    errorURL: string | null;

    constructor(attrs: Attributes.Role) {
      this.validUntil = attrs.validUntil;
      this.cacheDuration = attrs.cacheDuration;
      this.protocolSupportEnumeration = attrs.protocolSupportEnumeration;
      this.errorURL = attrs.errorURL;
    }
}

// <complexType name="SSODescriptorType" abstract="true">
//     <complexContent>
//         <extension base="md:RoleDescriptorType">
//             <sequence>
//                 <element ref="md:ArtifactResolutionService" minOccurs="0" maxOccurs="unbounded"/>
//                 <element ref="md:SingleLogoutService" minOccurs="0" maxOccurs="unbounded"/>
//                 <element ref="md:ManageNameIDService" minOccurs="0" maxOccurs="unbounded"/>
//                 <element ref="md:NameIDFormat" minOccurs="0" maxOccurs="unbounded"/>
//             </sequence>
//         </extension>
//     </complexContent>
// </complexType>
// <element name="ArtifactResolutionService" type="md:IndexedEndpointType"/>
// <element name="SingleLogoutService" type="md:EndpointType"/>
// <element name="ManageNameIDService" type="md:EndpointType"/>
// <element name="NameIDFormat" type="anyURI"/>

export namespace Attributes {
  export interface SSO extends Attributes.Role {}
}

export abstract class SSO extends Role implements Element, Attributes.SSO {
  // ArtifactResolutionService
  singleLogoutServices: Endpoint[] = [];
  // ManageNameIDService
  // NameIDFormat

  constructor(attrs: Attributes.SSO) {
    super(attrs);
  }
}

// <complexType name="IDPSSODescriptorType">
//     <complexContent>
//         <extension base="md:SSODescriptorType">
//             <sequence>
//                 <element ref="md:SingleSignOnService" maxOccurs="unbounded"/>
//                 <element ref="md:NameIDMappingService" minOccurs="0" maxOccurs="unbounded"/>
//                 <element ref="md:AssertionIDRequestService" minOccurs="0" maxOccurs="unbounded"/>
//                 <element ref="md:AttributeProfile" minOccurs="0" maxOccurs="unbounded"/>
//                 <element ref="saml:Attribute" minOccurs="0" maxOccurs="unbounded"/>
//             </sequence>
//             <attribute name="WantAuthnRequestsSigned" type="boolean" use="optional"/>
//         </extension>
//     </complexContent>
// </complexType>
// <element name="SingleSignOnService" type="md:EndpointType"/>
// <element name="NameIDMappingService" type="md:EndpointType"/>
// <element name="AssertionIDRequestService" type="md:EndpointType"/>
// <element name="AttributeProfile" type="anyURI"/>

export namespace Attributes {
  export interface IDPSSO extends Attributes.SSO {
    wantAuthnRequestsSigned: boolean | null;
  }
}

export class IDPSSO extends SSO implements Element, Attributes.IDPSSO {
  singleSignOnServices: Endpoint[] = []; // required
  // NameIDMappingService
  // AssertionIDRequestService
  // AttributeProfile
  // Attribute

  wantAuthnRequestsSigned: boolean | null;

  constructor(attrs: Attributes.IDPSSO) {
    super(attrs);
    this.wantAuthnRequestsSigned = attrs.wantAuthnRequestsSigned
  }
}

// <complexType name="RequestedAttributeType">
//     <complexContent>
//         <extension base="saml:AttributeType">
//             <attribute name="isRequired" type="boolean" use="optional"/>
//         </extension>
//     </complexContent>
// </complexType>

export namespace Attributes {
  export interface RequestedAttribute extends Attributes.Attribute {
    isRequired: boolean | null;
  }
}

export class RequestedAttribute extends Attribute implements Element, Attributes.RequestedAttribute {
  isRequired: boolean | null;

  constructor(attrs: Attributes.RequestedAttribute) {
    super(attrs);
    this.isRequired = attrs.isRequired;
  }
}

// <complexType name="AttributeConsumingServiceType">
//     <sequence>
//         <element ref="md:ServiceName" maxOccurs="unbounded"/>
//         <element ref="md:ServiceDescription" minOccurs="0" maxOccurs="unbounded"/>
//         <element ref="md:RequestedAttribute" maxOccurs="unbounded"/>
//     </sequence>
//     <attribute name="index" type="unsignedShort" use="required"/>
//     <attribute name="isDefault" type="boolean" use="optional"/>
// </complexType>
// <element name="ServiceName" type="md:localizedNameType"/>
// <element name="ServiceDescription" type="md:localizedNameType"/>
// <element name="RequestedAttribute" type="md:RequestedAttributeType"/>

export namespace Attributes {
  export interface AttributeConsumingService {
    index: number;
    isDefault: boolean | null;
  }
}

export class AttributeConsumingService implements Element, Attributes.AttributeConsumingService {
  serviceName: Localized[] = [];
  serviceDescription: Localized[] = [];
  requestedAttributes: RequestedAttribute[] = [];

  index: number;
  isDefault: boolean | null;

  constructor(attrs: Attributes.AttributeConsumingService) {
    this.index = attrs.index;
    this.isDefault = attrs.isDefault;
  }
}

// <complexType name="SPSSODescriptorType">
//     <complexContent>
//         <extension base="md:SSODescriptorType">
//             <sequence>
//                 <element ref="md:AssertionConsumerService" maxOccurs="unbounded"/>
//                 <element ref="md:AttributeConsumingService" minOccurs="0" maxOccurs="unbounded"/>
//             </sequence>
//             <attribute name="AuthnRequestsSigned" type="boolean" use="optional"/>
//             <attribute name="WantAssertionsSigned" type="boolean" use="optional"/>
//         </extension>
//     </complexContent>
// </complexType>
// <element name="AssertionConsumerService" type="md:IndexedEndpointType"/>
// <element name="AttributeConsumingService" type="md:AttributeConsumingServiceType"/>

export namespace Attributes {
  export interface SPSSO extends Attributes.SSO {
    authnRequestsSigned: boolean | null;
    wantAssertionsSigned: boolean | null;
  }
}

export class SPSSO extends SSO implements Element, Attributes.SPSSO {
  assertionConsumerServices: IndexedEndpoint[] = []; // required
  attributeConsumingServices: AttributeConsumingService[] = [];

  authnRequestsSigned: boolean | null;
  wantAssertionsSigned: boolean | null;

  constructor(attrs: Attributes.SPSSO) {
    super(attrs);
    this.authnRequestsSigned = attrs.authnRequestsSigned;
    this.wantAssertionsSigned = attrs.wantAssertionsSigned;
  }
}

export type Metadata = EntityDescriptor | EntitiesDescriptor;
