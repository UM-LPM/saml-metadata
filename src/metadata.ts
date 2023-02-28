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
        throw new ParseError(`The attribute "${name}" is required!`);
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
    parser.on('end', () => resolve(metadata));
    parser.on('error', (e) => reject(e));
  });

  for await (const chunk of stream) {
    parser.write(chunk);
  }
  parser.close();

  return await end;
}
