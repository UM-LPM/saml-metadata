import {Stream, Readable} from 'node:stream';
import sax from 'saxes';

// An incomplete implementation of the SAML metadata schema

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
type Localized = {lang: string; content: string};

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
interface Attribute {
  name: string; // required
  nameFormat: string | null;
  friendlyName: string | null;
  values: string[]
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
interface Endpoint {
  binding: string;
  location: string;
  responseLocation: string | null;
}
    
// <complexType name="IndexedEndpointType">
//     <complexContent>
//         <extension base="md:EndpointType">
//             <attribute name="index" type="unsignedShort" use="required"/>
//             <attribute name="isDefault" type="boolean" use="optional"/>
//         </extension>
//     </complexContent>
// </complexType>
interface IndexedEndpoint extends Endpoint {
  index: number;
  isDefault: boolean | null;
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
type KeyType = 'encryption' | 'signing';
interface Key {
  certificates: string[];
  //EncryptionMethod

  use: KeyType | null
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
interface EntitiesDescriptor {
  // Signature
  // Extensions
  entities: (EntityDescriptor | EntitiesDescriptor)[], // required

  validUntil: string | null; // Date
  cacheDuration: string | null; // Duration
  // ID
  name: string | null;
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
interface EntityDescriptor {
    entityID: string;
    validUntil: string | null; // Date
    cacheDuration: string | null; // Duration
    // ID

    // Signature
    // Extensions
    // RoleDescriptor
    // AuthnAuthorityDescriptor
    // AttributeAuthorityDescriptor
    // PDPDescriptor
    // AffiliationDescriptor
    idps: IDPSSO[];
    sps: SPSSO[];
    organization: Organization | null;
    contactPersons: ContactPerson[];
    // AdditionalMetadataLocation
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
interface Organization {
  // Extensions
  organizationName: Localized[];
  organizationDisplayName: Localized[];
  organizationURL: Localized[];
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
type ContactType = 'technical' | 'support' | 'administrative' | 'billing' | 'other';

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
interface ContactPerson {
  // Extensions
  company: string | null;
  givenName: string | null;
  surName: string | null;
  emailAddresses: string[];
  telephoneNumbers: string[];
  contactType: ContactType; // required
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
interface Role {
    // Signature
    // Extensions
    keys: Key[];
    organization: Organization | null;
    contactPersons: ContactPerson[];

    // ID
    validUntil: string | null; // Date
    cacheDuration: string | null; // Duration
    protocolSupportEnumeration: string[];
    errorURL: string | null;
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
interface SSO extends Role {
  // ArtifactResolutionService
  singleLogoutServices: Endpoint[];
  // ManageNameIDService
  // NameIDFormat
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
interface IDPSSO extends SSO {
  singleSignOnServices: Endpoint[]; // required
  // NameIDMappingService
  // AssertionIDRequestService
  // AttributeProfile
  // Attribute

  wantAuthnRequestsSigned: boolean | null;
}

// <complexType name="RequestedAttributeType">
//     <complexContent>
//         <extension base="saml:AttributeType">
//             <attribute name="isRequired" type="boolean" use="optional"/>
//         </extension>
//     </complexContent>
// </complexType>
interface RequestedAttribute extends Attribute {
  isRequired: boolean | null;
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
interface AttributeConsumingService {
  serviceName: Localized[];
  serviceDescription: Localized[];
  requestedAttributes: RequestedAttribute[];

  index: number;
  isDefault: boolean | null;
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
interface SPSSO extends SSO {
  assertionConsumerServices: IndexedEndpoint[]; // required
  attributeConsumingServices: AttributeConsumingService[];

  authnRequestsSigned: boolean | null;
  wantAssertionsSigned: boolean | null;
}

type Metadata = EntityDescriptor | EntitiesDescriptor;
    
function parseBoolean(s: string | null): boolean | null {
  switch(s) {
    case 'true': return true;
    case 'false': return false;
    default: return null;
  }
}

function parseInteger(s: string | null): number | null {
  if (!s) {
    return null;
  }
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function parseUse(s: string | null): KeyType | null {
  switch(s) {
    case 'encryption':
    case 'signing':
      return s as KeyType;
    default: return null;
  }
}

function parseEnumeration(s: string | null): string[] {
  if (!s) {
    return [];
  }
  return s.split(' ');
}

function parseContactType(s: string): ContactType {
  switch(s) {
    case 'technical':
    case 'support':
    case 'administrative':
    case 'billing':
    case 'other':
      return s as ContactType;
    default: throw new Error('Invalid contact type.');
  }
}

namespace Path {
  export interface Matcher {
    match(top: Tag[], k: (top_: Tag[]) => boolean): boolean
  }

  class Tag implements Matcher {
    ns: string | undefined;
    local: string;

    constructor(ns: string | undefined, local: string) {
      this.ns = ns;
      this.local = local;
    }

    equal(other: Tag) {
      return this.ns === other.ns && this.local === other.local;
    }

    match(top: Tag[], k: (top_: Tag[]) => boolean): boolean {
      return top.length === 0 
        ? false 
        : top[top.length - 1].equal(this) && k(top.slice(0, -1));
    }
  }


  class And implements Matcher {
    left: Matcher;
    right: Matcher;

    constructor(left: Matcher, right: Matcher) {
      this.left = left;
      this.right = right;
    }

    match(top: Tag[], k: (top_: Tag[]) => boolean): boolean {
      return this.right.match(top, (top_) => this.left.match(top_, k)); // Match in reverse
    }
  }

  class Or implements Matcher {
    ms: Matcher[];

    constructor(ms: Matcher[]) {
      this.ms = ms;
    }

    match(top: Tag[], k: (top_: Tag[]) => boolean): boolean {
      return this.ms.some((m) => m.match(top, k));
    }
  }

  class Repeat implements Matcher {
    m: Matcher;

    constructor(m: Matcher) {
      this.m = m; 
    }

    matchRepeatedly(top: Tag[], k: (top_: Tag[]) => boolean): boolean {
      return k(top) || this.m.match(top, (top_) => top !== top_ && this.matchRepeatedly(top_, k));
    }

    match(top: Tag[], k: (top_: Tag[]) => boolean): boolean {
      return this.matchRepeatedly(top, k);
    }
  }

  class Empty implements Matcher {
    match(top: Tag[], k: (top_: Tag[]) => boolean): boolean {
      return k(top);
    }
  }

  class Root implements Matcher {
    match(top: Tag[], k: (top_: Tag[]) => boolean): boolean {
      return top.length === 0;
    }
  }

  export function or(ms: Matcher[]) {
    return new Or(ms);
  }

  export function and(left: Matcher, right: Matcher) {
    return new And(left, right);
  }

  export function tag(ns: string | undefined, tag: string) {
    return new Tag(ns, tag);
  }

  export function repeat(m: Matcher) {
    return new Repeat(m);
  }

  export const root = new Root();

  export const empty = new Empty();

  export class Stack {
    tags: Tag[] = [];

    push(ns: string | undefined, local: string) {
      this.tags.push(new Tag(ns, local));
    }

    pop(ns_: string | undefined, local_: string) {
      const tag = this.tags.pop();
      if (tag === undefined) {
        throw Error('Stack empty'); 
      }
      if (!tag.equal(new Tag(ns_, local_))) {
        throw Error(`Unexpected tag ${tag}`); 
      }
    }

    match(m: Matcher): boolean {
      return m.match(this.tags, (_) => true);
    }
  }
}

import p = Path

export default async function(stream: Readable): Promise<Metadata | undefined> {

  const parser = new sax.SaxesParser({xmlns: true});

  const tags: p.Stack = new p.Stack();
  let metadata: Metadata | undefined;
  let nss: {[key: string]: string}[] = [];

  const EntitiesDescriptorStack: EntitiesDescriptor[] = [];
  let EntityDescriptor: EntityDescriptor | undefined;
  let SPSSODescriptor: SPSSO | undefined;
  let IDPSSODescriptor: IDPSSO | undefined;
  let KeyDescriptor: Key | undefined;
  let Organization: Organization | undefined;
  let OrganizationName: Localized | undefined;
  let OrganizationDisplayName: Localized | undefined;
  let OrganizationURL: Localized | undefined;
  let ContactPerson: ContactPerson | undefined;
  let Company: boolean = false;
  let GivenName: boolean = false;
  let SurName: boolean = false;
  let EmailAddress: boolean = false;
  let TelephoneNumber: boolean = false;
  let SingleSignOnService: Endpoint | undefined;
  let SingleLogoutService: Endpoint | undefined;
  let AssertionConsumerService: IndexedEndpoint | undefined;
  let AttributeConsumingService: AttributeConsumingService | undefined;
  let ServiceName: Localized | undefined;
  let ServiceDescription: Localized | undefined;
  let RequestedAttribute: RequestedAttribute | undefined;
  let AttributeValue: boolean = false;
  let X509Certificate: boolean = false;

  // Namespaces
  const md: string = 'urn:oasis:names:tc:SAML:2.0:metadata';
  const ds: string = 'http://www.w3.org/2000/09/xmldsig#';
  const saml: string = 'urn:oasis:names:tc:SAML:2.0:assertion';

  parser.on('opentag', (tag) => {
    function opt(name: string): string | null {
      const attribute = tag.attributes[name];
      if (attribute) {
        return attribute.value;
      } else {
        return null;
      }
    }
    function req(name: string): string {
      const attribute = tag.attributes[name];
      if (attribute) {
        return attribute.value;
      } else {
        throw new Error(`The attribute "${name}" is required!`);
      }
    }
    function createSSO() {
      return {
        validUntil: opt('validUntil'),
        cacheDuration: opt('cacheDuration'),
        errorURL: opt('errorURL'),
        protocolSupportEnumeration: parseEnumeration(opt('protocolSupportEnumeration')),
        organization: null,
        contactPersons: [],
        keys: [],
        singleLogoutServices: [],
      };
    }
    function createEndpoint() {
      return {
        binding: req('Binding'),
        location: req('Location'),
        responseLocation: opt('ResponseLocation'),
      };
    }
    function createLocalized() {
      return {
        lang: req('xml:lang'),
        content: '',
      };
    }

    nss.push({...nss[nss.length - 1], ...tag.ns});

    // Paths are (transitively) verified up to the root, that way we reject any sneaky fake roots inside sections where anything is allowed 
    const ns = nss[nss.length - 1][tag.prefix];
    switch (ns) {
      case md:
        switch (tag.local) {
          case 'EntitiesDescriptor':
            if (tags.match(p.and(p.root, p.repeat(p.tag(md, 'EntitiesDescriptor'))))) { 
              EntitiesDescriptorStack.push({
                entities: [],
                validUntil: opt('validUntil'),
                cacheDuration: opt('cacheDuration'),
                name: opt('Name')
              });
            }
            break;
          case 'EntityDescriptor':
            if (tags.match(p.and(p.root, p.repeat(p.tag(md, 'EntitiesDescriptor'))))) { 
              EntityDescriptor = {
                entityID: req('entityID'),
                validUntil: opt('validUntil'),
                cacheDuration: opt('cacheDuration'),
                organization: null,
                contactPersons: [],
                idps: [],
                sps: [],
              };
            }
            break;
          case 'IDPSSODescriptor':
            if (EntityDescriptor &&
                tags.match(p.tag(md, 'EntityDescriptor'))) {
              IDPSSODescriptor = {
                ...createSSO(),
                wantAuthnRequestsSigned: parseBoolean(opt('WantAuthnRequestsSigned')),
                singleSignOnServices: [],
              };
            }
            break;
          case 'SPSSODescriptor':
            if (EntityDescriptor &&
                tags.match(p.tag(md, 'EntityDescriptor'))) {
              SPSSODescriptor = {
                ...createSSO(),
                authnRequestsSigned: parseBoolean(opt('AuthnRequestsSigned')),
                wantAssertionsSigned: parseBoolean(opt('WantAssertionsSigned')),
                assertionConsumerServices: [],
                attributeConsumingServices: [],
              };
            }
            break;
          case 'SingleLogoutService':
            if (EntityDescriptor && 
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.or([p.tag(md, 'IDPSSODescriptor'), p.tag(md, 'SPSSODescriptor')])))) {
              SingleLogoutService = createEndpoint();
            }
            break;
          case 'SingleSignOnService':
            if (EntityDescriptor && 
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.tag(md, 'IDPSSODescriptor')))) {
              SingleSignOnService = createEndpoint();
            }
            break;
          case 'AssertionConsumerService':
            if (EntityDescriptor && 
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.tag(md, 'SPSSODescriptor')))) {
              AssertionConsumerService = {
                ...createEndpoint(),
                index: parseInteger(opt('index'))!,
                isDefault: parseBoolean(opt('isDefault')),
              };
            }
          case 'AttributeConsumingService':
            if (EntityDescriptor && 
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.tag(md, 'SPSSODescriptor')))) {
              AttributeConsumingService = {
                serviceName: [],
                serviceDescription: [],
                requestedAttributes: [],
                index: parseInteger(opt('index'))!,
                isDefault: parseBoolean(opt('isDefault')),
              };
            }
            break;
          case 'ServiceName':
            if (AttributeConsumingService &&
                tags.match(p.tag(md, 'AttributeConsumingService'))) {
              ServiceName = createLocalized();
            }
            break;
          case 'ServiceDescription':
            if (AttributeConsumingService &&
                tags.match(p.tag(md, 'AttributeConsumingService'))) {
              ServiceDescription = createLocalized();
            }
            break;
          case 'RequestedAttribute':
            if (AttributeConsumingService &&
                tags.match(p.tag(md, 'AttributeConsumingService'))) {
              RequestedAttribute = {
                name: req('Name'),
                nameFormat: opt('NameFormat'),
                friendlyName: opt('FriendlyName'),
                values: [],
                isRequired: parseBoolean(opt('isRequired')),
              };
            }
            break;
          case 'KeyDescriptor':
            if (EntityDescriptor &&
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.or([p.tag(md, 'IDPSSODescriptor'), p.tag(md, 'SPSSODescriptor')])))) {
              KeyDescriptor = {
                use: parseUse(opt('use')),
                certificates: []
              };
            }
            break;
          case 'ContactPerson':
            if (EntityDescriptor &&
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.or([p.empty, p.tag(md, 'IDPSSODescriptor'), p.tag(md, 'SPSSODescriptor')])))) {
              ContactPerson = {
                contactType: parseContactType(req('contactType')),
                company: null,
                givenName: null,
                surName: null,
                emailAddresses: [],
                telephoneNumbers: [],
              };
            }
            break;
          case 'Company':
            if (ContactPerson &&
                tags.match(p.tag(md, 'ContactPerson'))) {
              Company = true;
            }
            break;
          case 'GivenName':
            if (ContactPerson &&
                tags.match(p.tag(md, 'ContactPerson'))) {
              GivenName = true;
            }
            break;
          case 'SurName':
            if (ContactPerson &&
                tags.match(p.tag(md, 'ContactPerson'))) {
              SurName = true;
            }
            break;
          case 'EmailAddress':
            if (ContactPerson &&
                tags.match(p.tag(md, 'ContactPerson'))) {
              EmailAddress = true;
            }
            break;
          case 'TelephoneNumber':
            if (ContactPerson &&
                tags.match(p.tag(md, 'ContactPerson'))) {
              TelephoneNumber = true;
            }
            break;
          case 'Organization':
            if (EntityDescriptor && 
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.or([p.empty, p.tag(md, 'IDPSSODescriptor'), p.tag(md, 'SPSSODescriptor')])))) {
              Organization = {
                organizationName: [],
                organizationDisplayName: [],
                organizationURL: [],
              };
            }
            break;
          case 'OrganizationName':
            if (Organization &&
                tags.match(p.tag(md, 'Organization'))) {
              OrganizationName = createLocalized();
            }
            break;
          case 'OrganizationDisplayName':
            if (Organization &&
                tags.match(p.tag(md, 'Organization'))) {
              OrganizationDisplayName = createLocalized();
            }
            break;
          case 'OrganizationURL':
            if (Organization && 
                tags.match(p.tag(md, 'Organization'))) {
              OrganizationURL = createLocalized();
            }
            break;
        }
        break;
      case ds:
        switch (tag.local) {
          case 'X509Certificate':
            if (KeyDescriptor &&
                tags.match(p.and(p.and(p.tag(md, 'KeyDescriptor'), p.tag(ds, 'KeyInfo')), p.tag(ds, 'X509Data')))) {
              X509Certificate = true;
            }
            break;
        }
        break;
      case saml:
        switch (tag.local) {
          case 'AttributeValue':
            if (RequestedAttribute &&
                tags.match(p.tag(md, 'Attribute'))) {
              AttributeValue = true;
            }
            break;
        }
        break;
    }

    tags.push(ns, tag.local);
  });

  parser.on('text', (text: string) => {
    if (KeyDescriptor && X509Certificate) {
      KeyDescriptor.certificates.push(text);
    } else if (RequestedAttribute && AttributeValue) {
      RequestedAttribute.values.push(text);
    } else if (ServiceName) {
      ServiceName.content = text;
    } else if (ServiceDescription) {
      ServiceDescription.content = text;
    } else if (ContactPerson && Company) {
      ContactPerson.company = text;
    } else if (ContactPerson && GivenName) {
      ContactPerson.givenName = text;
    } else if (ContactPerson && SurName) {
      ContactPerson.surName = text;
    } else if (ContactPerson && EmailAddress) {
      ContactPerson.emailAddresses.push(text);
    } else if (ContactPerson && TelephoneNumber) {
      ContactPerson.telephoneNumbers.push(text);
    } else if (OrganizationName) {
      OrganizationName.content = text;
    } else if (OrganizationDisplayName) {
      OrganizationDisplayName.content = text;
    } else if (OrganizationURL) {
      OrganizationURL.content = text;
    }
  });

  parser.on('closetag', (tag) => {
    const ns = nss[nss.length - 1][tag.prefix];
    switch (ns) {
      case md:
        switch (tag.local) {
          case 'EntitiesDescriptor': {
            const EntitiesDescriptor = EntitiesDescriptorStack.pop(); 
            if (EntitiesDescriptorStack.length === 0) {
              metadata = EntitiesDescriptor
            } else {
              EntitiesDescriptorStack[EntitiesDescriptorStack.length - 1].entities.push(EntitiesDescriptor!);
            }
            break;
          } case 'EntityDescriptor':
            if (EntityDescriptor) {
              if (EntitiesDescriptorStack.length === 0) {
                metadata = EntityDescriptor
              } else {
                EntitiesDescriptorStack[EntitiesDescriptorStack.length - 1].entities.push(EntityDescriptor);
              }
            }
            EntityDescriptor = undefined;
            break;
          case 'IDPSSODescriptor':
            if (IDPSSODescriptor) {
              EntityDescriptor!.idps.push(IDPSSODescriptor);
            }
            IDPSSODescriptor = undefined;
            break;
          case 'SPSSODescriptor':
            if (SPSSODescriptor) {
              EntityDescriptor!.sps.push(SPSSODescriptor);
            }
            SPSSODescriptor = undefined;
            break;
          case 'SingleLogoutService': {
            const x = IDPSSODescriptor || SPSSODescriptor;
            if (SingleLogoutService) {
              x!.singleLogoutServices.push(SingleLogoutService);
            }
            SingleLogoutService = undefined;
            break;
          } case 'SingleSignOnService':
            if (SingleSignOnService) {
              IDPSSODescriptor!.singleSignOnServices.push(SingleSignOnService);
            }
            SingleSignOnService = undefined;
            break;
          case 'AssertionConsumerService':
            if (AssertionConsumerService) {
              SPSSODescriptor!.assertionConsumerServices.push(AssertionConsumerService);
            }
            AssertionConsumerService = undefined;
            break;
          case 'AttributeConsumingService':
            if (AttributeConsumingService) {
              SPSSODescriptor!.attributeConsumingServices.push(AttributeConsumingService);
            }
            AttributeConsumingService = undefined;
            break;
          case 'ServiceName':
            if (ServiceName) {
              AttributeConsumingService!.serviceName.push(ServiceName);
            }
            ServiceName = undefined;
            break;
          case 'ServiceDescription':
            if (ServiceDescription) {
              AttributeConsumingService!.serviceDescription.push(ServiceDescription);
            }
            ServiceDescription = undefined;
            break;
          case 'RequestedAttribute':
            if (RequestedAttribute) {
              AttributeConsumingService!.requestedAttributes.push(RequestedAttribute);
            }
            RequestedAttribute = undefined;
            break;
          case 'KeyDescriptor': {
            const x = IDPSSODescriptor || SPSSODescriptor;
            if (KeyDescriptor) {
              x!.keys.push(KeyDescriptor);
            }
            KeyDescriptor = undefined;
            break;
          } case 'ContactPerson':
            const x = EntityDescriptor || IDPSSODescriptor || SPSSODescriptor;
            if (ContactPerson) {
              x!.contactPersons.push(ContactPerson);
            }
            ContactPerson = undefined;
            break;
          case 'Company':
            Company = false;
            break;
          case 'GivenName':
            GivenName = false;
            break;
          case 'SurName':
            SurName = false;
            break;
          case 'EmailAddress':
            EmailAddress = false;
            break;
          case 'TelephoneNumber':
            TelephoneNumber = false;
            break;
          case 'Organization': {
            const x = EntityDescriptor || IDPSSODescriptor || SPSSODescriptor;
            if (Organization) {
              x!.organization = Organization;
            }
            Organization = undefined;
            break;
          } case 'OrganizationName':
            if (OrganizationName) {
              Organization!.organizationName.push(OrganizationName);
            }
            OrganizationName = undefined;
            break;
          case 'OrganizationDisplayName':
            if (OrganizationDisplayName) {
              Organization!.organizationDisplayName.push(OrganizationDisplayName);
            }
            OrganizationDisplayName = undefined;
            break;
          case 'OrganizationURL':
            if (OrganizationURL) {
              Organization!.organizationURL.push(OrganizationURL);
            }
            OrganizationURL = undefined;
            break;
        }
        break;
      case ds:
        switch (tag.local) {
          case 'X509Certificate':
            X509Certificate = false;
            break;
        }
        break;
      case saml:
        switch (tag.local) {
          case 'AttributeValue':
            AttributeValue = false;
            break;
        }
        break;
    }
    tags.pop(ns, tag.local);
    nss.pop();
  });
  const end: Promise<Metadata | undefined> = new Promise((resolve, reject) => {
    parser.on('end', () =>  resolve(metadata));
    parser.on('error', (e) => reject(e));
  });

  for await (const chunk of stream) {
    parser.write(chunk);
  }
  parser.close();

  return await end;
}
