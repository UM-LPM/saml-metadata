import {Stream, Readable} from 'node:stream';
import sax from 'saxes';

import {
  ParseError,
  Localized,
  Attribute,
  Endpoint,
  IndexedEndpoint,
  KeyType,
  Key,
  EntitiesDescriptor,
  EntityDescriptor,
  Organization,
  ContactType,
  ContactPerson,
  Role,
  IDPSSO,
  RequestedAttribute,
  AttributeConsumingService,
  SPSSO,
  Metadata
} from './types.js';
import * as p from './path.js';

function parseBoolean(s: string | null): boolean | null {
  switch(s) {
    case null: return null;
    case 'true': return true;
    case 'false': return false;
    default: throw new ParseError(`Boolean expected: "${s}"`)
  }
}

function parseInteger(s: string | null): number | null {
  if (!s) {
    return null;
  }
  const n = parseInt(s, 10);
  if (isNaN(n)) {
    throw new ParseError(`Integer expected: "${s}"`);
  } else {
    return n;
  }
}

function parseUse(s: string | null): KeyType | null {
  switch(s) {
    case null: return null;
    case 'encryption':
    case 'signing':
      return s as KeyType;
    default: throw new ParseError(`Invalid key type: "${s}"`);
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
    default: throw new ParseError(`Invalid contact type: "${s}"`);
  }
}

export default async function(stream: Readable): Promise<Metadata | undefined> {

  const parser = new sax.SaxesParser({xmlns: true});

  const tags: p.Stack = new p.Stack();
  let metadata: Metadata | undefined;
  let nss: {[key: string]: string}[] = [];

  const EntitiesDescriptorStack_: EntitiesDescriptor[] = [];
  let EntityDescriptor_: EntityDescriptor | undefined;
  let SPSSODescriptor_: SPSSO | undefined;
  let IDPSSODescriptor_: IDPSSO | undefined;
  let KeyDescriptor_: Key | undefined;
  let Organization_: Organization | undefined;
  let OrganizationName_: Localized | undefined;
  let OrganizationDisplayName_: Localized | undefined;
  let OrganizationURL_: Localized | undefined;
  let ContactPerson_: ContactPerson | undefined;
  let Company_: boolean = false;
  let GivenName_: boolean = false;
  let SurName_: boolean = false;
  let EmailAddress_: boolean = false;
  let TelephoneNumber_: boolean = false;
  let SingleSignOnService_: Endpoint | undefined;
  let SingleLogoutService_: Endpoint | undefined;
  let AssertionConsumerService_: IndexedEndpoint | undefined;
  let AttributeConsumingService_: AttributeConsumingService | undefined;
  let ServiceName_: Localized | undefined;
  let ServiceDescription_: Localized | undefined;
  let RequestedAttribute_: RequestedAttribute | undefined;
  let AttributeValue_: boolean = false;
  let X509Certificate_: boolean = false;

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
        throw new ParseError(`The attribute "${name}" is required!`);
      }
    }
    function createSSO() {
      return {
        validUntil: opt('validUntil'),
        cacheDuration: opt('cacheDuration'),
        errorURL: opt('errorURL'),
        protocolSupportEnumeration: parseEnumeration(opt('protocolSupportEnumeration')),
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
              EntitiesDescriptorStack_.push(new EntitiesDescriptor({
                validUntil: opt('validUntil'),
                cacheDuration: opt('cacheDuration'),
                name: opt('Name'),
              }));
            }
            break;
          case 'EntityDescriptor':
            if (tags.match(p.and(p.root, p.repeat(p.tag(md, 'EntitiesDescriptor'))))) { 
              EntityDescriptor_ = new EntityDescriptor({
                entityID: req('entityID'),
                validUntil: opt('validUntil'),
                cacheDuration: opt('cacheDuration'),
              });
            }
            break;
          case 'IDPSSODescriptor':
            if (EntityDescriptor &&
                tags.match(p.tag(md, 'EntityDescriptor'))) {
              IDPSSODescriptor_ = new IDPSSO({
                ...createSSO(),
                wantAuthnRequestsSigned: parseBoolean(opt('WantAuthnRequestsSigned')),
              });
            }
            break;
          case 'SPSSODescriptor':
            if (EntityDescriptor &&
                tags.match(p.tag(md, 'EntityDescriptor'))) {
              SPSSODescriptor_ = new SPSSO({
                ...createSSO(),
                authnRequestsSigned: parseBoolean(opt('AuthnRequestsSigned')),
                wantAssertionsSigned: parseBoolean(opt('WantAssertionsSigned')),
              });
            }
            break;
          case 'SingleLogoutService':
            if (EntityDescriptor && 
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.or([p.tag(md, 'IDPSSODescriptor'), p.tag(md, 'SPSSODescriptor')])))) {
              SingleLogoutService_ = new Endpoint(createEndpoint());
            }
            break;
          case 'SingleSignOnService':
            if (EntityDescriptor && 
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.tag(md, 'IDPSSODescriptor')))) {
              SingleSignOnService_ = new Endpoint(createEndpoint());
            }
            break;
          case 'AssertionConsumerService':
            if (EntityDescriptor && 
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.tag(md, 'SPSSODescriptor')))) {
              AssertionConsumerService_ = new IndexedEndpoint({
                ...createEndpoint(),
                index: parseInteger(opt('index'))!,
                isDefault: parseBoolean(opt('isDefault')),
              });
            }
          case 'AttributeConsumingService':
            if (EntityDescriptor && 
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.tag(md, 'SPSSODescriptor')))) {
              AttributeConsumingService_ = new AttributeConsumingService({
                index: parseInteger(opt('index'))!,
                isDefault: parseBoolean(opt('isDefault')),
              });
            }
            break;
          case 'ServiceName':
            if (AttributeConsumingService &&
                tags.match(p.tag(md, 'AttributeConsumingService'))) {
              ServiceName_ = new Localized(createLocalized());
            }
            break;
          case 'ServiceDescription':
            if (AttributeConsumingService &&
                tags.match(p.tag(md, 'AttributeConsumingService'))) {
              ServiceDescription_ = new Localized(createLocalized());
            }
            break;
          case 'RequestedAttribute':
            if (AttributeConsumingService &&
                tags.match(p.tag(md, 'AttributeConsumingService'))) {
              RequestedAttribute_ = new RequestedAttribute({
                name: req('Name'),
                nameFormat: opt('NameFormat'),
                friendlyName: opt('FriendlyName'),
                isRequired: parseBoolean(opt('isRequired')),
              });
            }
            break;
          case 'KeyDescriptor':
            if (EntityDescriptor &&
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.or([p.tag(md, 'IDPSSODescriptor'), p.tag(md, 'SPSSODescriptor')])))) {
              KeyDescriptor_ = new Key({
                use: parseUse(opt('use')),
              });
            }
            break;
          case 'ContactPerson':
            if (EntityDescriptor &&
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.or([p.empty, p.tag(md, 'IDPSSODescriptor'), p.tag(md, 'SPSSODescriptor')])))) {
              ContactPerson_ = new ContactPerson({
                contactType: parseContactType(req('contactType')),
              });
            }
            break;
          case 'Company':
            if (ContactPerson &&
                tags.match(p.tag(md, 'ContactPerson'))) {
              Company_ = true;
            }
            break;
          case 'GivenName':
            if (ContactPerson &&
                tags.match(p.tag(md, 'ContactPerson'))) {
              GivenName_ = true;
            }
            break;
          case 'SurName':
            if (ContactPerson &&
                tags.match(p.tag(md, 'ContactPerson'))) {
              SurName_ = true;
            }
            break;
          case 'EmailAddress':
            if (ContactPerson &&
                tags.match(p.tag(md, 'ContactPerson'))) {
              EmailAddress_ = true;
            }
            break;
          case 'TelephoneNumber':
            if (ContactPerson &&
                tags.match(p.tag(md, 'ContactPerson'))) {
              TelephoneNumber_ = true;
            }
            break;
          case 'Organization':
            if (EntityDescriptor && 
                tags.match(p.and(p.tag(md, 'EntityDescriptor'), p.or([p.empty, p.tag(md, 'IDPSSODescriptor'), p.tag(md, 'SPSSODescriptor')])))) {
              Organization_ = new Organization({
              });
            }
            break;
          case 'OrganizationName':
            if (Organization &&
                tags.match(p.tag(md, 'Organization'))) {
              OrganizationName_ = new Localized(createLocalized());
            }
            break;
          case 'OrganizationDisplayName':
            if (Organization &&
                tags.match(p.tag(md, 'Organization'))) {
              OrganizationDisplayName_ = new Localized(createLocalized());
            }
            break;
          case 'OrganizationURL':
            if (Organization && 
                tags.match(p.tag(md, 'Organization'))) {
              OrganizationURL_ = new Localized(createLocalized());
            }
            break;
        }
        break;
      case ds:
        switch (tag.local) {
          case 'X509Certificate':
            if (KeyDescriptor_ &&
                tags.match(p.and(p.and(p.tag(md, 'KeyDescriptor'), p.tag(ds, 'KeyInfo')), p.tag(ds, 'X509Data')))) {
              X509Certificate_ = true;
            }
            break;
        }
        break;
      case saml:
        switch (tag.local) {
          case 'AttributeValue':
            if (RequestedAttribute &&
                tags.match(p.tag(md, 'Attribute'))) {
              AttributeValue_ = true;
            }
            break;
        }
        break;
    }

    tags.push(ns, tag.local);
  });

  parser.on('text', (text: string) => {
    if (KeyDescriptor_ && X509Certificate_) {
      KeyDescriptor_.certificates.push(text);
    } else if (RequestedAttribute_ && AttributeValue_) {
      RequestedAttribute_.values.push(text);
    } else if (ServiceName_) {
      ServiceName_.content = text;
    } else if (ServiceDescription_) {
      ServiceDescription_.content = text;
    } else if (ContactPerson_ && Company_) {
      ContactPerson_.company = text;
    } else if (ContactPerson_ && GivenName_) {
      ContactPerson_.givenName = text;
    } else if (ContactPerson_ && SurName_) {
      ContactPerson_.surName = text;
    } else if (ContactPerson_ && EmailAddress_) {
      ContactPerson_.emailAddresses.push(text);
    } else if (ContactPerson_ && TelephoneNumber_) {
      ContactPerson_.telephoneNumbers.push(text);
    } else if (OrganizationName_) {
      OrganizationName_.content = text;
    } else if (OrganizationDisplayName_) {
      OrganizationDisplayName_.content = text;
    } else if (OrganizationURL_) {
      OrganizationURL_.content = text;
    }
  });

  parser.on('closetag', (tag) => {
    const ns = nss[nss.length - 1][tag.prefix];
    switch (ns) {
      case md:
        switch (tag.local) {
          case 'EntitiesDescriptor': {
            const EntitiesDescriptor_ = EntitiesDescriptorStack_.pop(); 
            if (EntitiesDescriptorStack_.length === 0) {
              metadata = EntitiesDescriptor_
            } else {
              EntitiesDescriptorStack_[EntitiesDescriptorStack_.length - 1].entities.push(EntitiesDescriptor_!);
            }
            break;
          } case 'EntityDescriptor':
            if (EntityDescriptor_) {
              if (EntitiesDescriptorStack_.length === 0) {
                metadata = EntityDescriptor_
              } else {
                EntitiesDescriptorStack_[EntitiesDescriptorStack_.length - 1].entities.push(EntityDescriptor_);
              }
            }
            EntityDescriptor_ = undefined;
            break;
          case 'IDPSSODescriptor':
            if (IDPSSODescriptor_) {
              EntityDescriptor_!.idps.push(IDPSSODescriptor_);
            }
            IDPSSODescriptor_ = undefined;
            break;
          case 'SPSSODescriptor':
            if (SPSSODescriptor_) {
              EntityDescriptor_!.sps.push(SPSSODescriptor_);
            }
            SPSSODescriptor_ = undefined;
            break;
          case 'SingleLogoutService': {
            const x = IDPSSODescriptor_ || SPSSODescriptor_;
            if (SingleLogoutService_) {
              x!.singleLogoutServices.push(SingleLogoutService_);
            }
            SingleLogoutService_ = undefined;
            break;
          } case 'SingleSignOnService':
            if (SingleSignOnService_) {
              IDPSSODescriptor_!.singleSignOnServices.push(SingleSignOnService_);
            }
            SingleSignOnService_ = undefined;
            break;
          case 'AssertionConsumerService':
            if (AssertionConsumerService_) {
              SPSSODescriptor_!.assertionConsumerServices.push(AssertionConsumerService_);
            }
            AssertionConsumerService_ = undefined;
            break;
          case 'AttributeConsumingService':
            if (AttributeConsumingService_) {
              SPSSODescriptor_!.attributeConsumingServices.push(AttributeConsumingService_);
            }
            AttributeConsumingService_ = undefined;
            break;
          case 'ServiceName':
            if (ServiceName_) {
              AttributeConsumingService_!.serviceName.push(ServiceName_);
            }
            ServiceName_ = undefined;
            break;
          case 'ServiceDescription':
            if (ServiceDescription_) {
              AttributeConsumingService_!.serviceDescription.push(ServiceDescription_);
            }
            ServiceDescription_ = undefined;
            break;
          case 'RequestedAttribute':
            if (RequestedAttribute_) {
              AttributeConsumingService_!.requestedAttributes.push(RequestedAttribute_);
            }
            RequestedAttribute_ = undefined;
            break;
          case 'KeyDescriptor': {
            const x = IDPSSODescriptor_ || SPSSODescriptor_;
            if (KeyDescriptor_) {
              x!.keys.push(KeyDescriptor_);
            }
            KeyDescriptor_ = undefined;
            break;
          } case 'ContactPerson':
            const x = EntityDescriptor_ || IDPSSODescriptor_ || SPSSODescriptor_;
            if (ContactPerson_) {
              x!.contactPersons.push(ContactPerson_);
            }
            ContactPerson_ = undefined;
            break;
          case 'Company':
            Company_ = false;
            break;
          case 'GivenName':
            GivenName_ = false;
            break;
          case 'SurName':
            SurName_ = false;
            break;
          case 'EmailAddress':
            EmailAddress_ = false;
            break;
          case 'TelephoneNumber':
            TelephoneNumber_ = false;
            break;
          case 'Organization': {
            const x = EntityDescriptor_ || IDPSSODescriptor_ || SPSSODescriptor_;
            if (Organization_) {
              x!.organization = Organization_;
            }
            Organization_ = undefined;
            break;
          } case 'OrganizationName':
            if (OrganizationName_) {
              Organization_!.organizationName.push(OrganizationName_);
            }
            OrganizationName_ = undefined;
            break;
          case 'OrganizationDisplayName':
            if (OrganizationDisplayName_) {
              Organization_!.organizationDisplayName.push(OrganizationDisplayName_);
            }
            OrganizationDisplayName_ = undefined;
            break;
          case 'OrganizationURL':
            if (OrganizationURL_) {
              Organization_!.organizationURL.push(OrganizationURL_);
            }
            OrganizationURL_ = undefined;
            break;
        }
        break;
      case ds:
        switch (tag.local) {
          case 'X509Certificate':
            X509Certificate_ = false;
            break;
        }
        break;
      case saml:
        switch (tag.local) {
          case 'AttributeValue':
            AttributeValue_ = false;
            break;
        }
        break;
    }
    tags.pop(ns, tag.local);
    nss.pop();
  });
  const end: Promise<Metadata | undefined> = new Promise((resolve, reject) => {
    parser.on('end', () => resolve(metadata));
    parser.on('error', (e) => reject(e));
  });

  for await (const chunk of stream) {
    parser.write(chunk);
  }
  parser.close();

  return await end;
}
