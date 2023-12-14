import {Stream, Readable} from 'node:stream';
import sax from 'saxes';

import * as t from './types.js';

function parseBoolean(s: string | null): boolean | null {
  switch(s) {
    case null: return null;
    case 'true': return true;
    case 'false': return false;
    default: throw new t.ParseError(`Boolean expected: "${s}"`)
  }
}

function parseInteger(s: string | null): number | null {
  if (!s) {
    return null;
  }
  const n = parseInt(s, 10);
  if (isNaN(n)) {
    throw new t.ParseError(`Integer expected: "${s}"`);
  } else {
    return n;
  }
}

function parseUse(s: string | null): t.KeyType | null {
  switch(s) {
    case null: return null;
    case 'encryption':
    case 'signing':
      return s as t.KeyType;
    default: throw new t.ParseError(`Invalid key type: "${s}"`);
  }
}

function parseEnumeration(s: string | null): string[] {
  if (!s) {
    return [];
  }
  return s.split(' ');
}

function parseContactType(s: string): t.ContactType {
  switch(s) {
    case 'technical':
    case 'support':
    case 'administrative':
    case 'billing':
    case 'other':
      return s as t.ContactType;
    default: throw new t.ParseError(`Invalid contact type: "${s}"`);
  }
}

class Tag {
  ns: string | null;
  local: string;

  constructor(ns: string | null, local: string) {
    this.ns = ns;
    this.local = local;
  }

  match(ns: string | null, local: string) {
    return this.ns === ns && this.local === local;
  }
}

export class Stack {
  tags: Tag[] = [];

  push(ns: string | null, local: string) {
    this.tags.push(new Tag(ns, local));
  }

  pop(ns_: string | null, local_: string) {
    const tag = this.tags.pop();
    if (tag === undefined) {
      throw new t.ParseError('Stack empty'); 
    }
    if (!tag.match(ns_, local_)) {
      throw new t.ParseError(`Unexpected tag ${tag}`); 
    }
  }

  root(): boolean {
    return this.tags.length === 0;
  }

  match(ns: string | null, local: string): boolean {
    return this.tags[this.tags.length - 1].match(ns, local);
  }
}

export default async function(stream: Readable): Promise<t.Metadata | undefined> {

  const parser = new sax.SaxesParser({xmlns: true});

  let stack: Stack = new Stack();

  let metadata: t.Metadata | undefined;
  let nss: {[key: string]: string}[] = [];

  const EntitiesDescriptorStack_: t.EntitiesDescriptor[] = [];
  let EntityDescriptor_: t.EntityDescriptor | undefined;
  let SPSSODescriptor_: t.SPSSO | undefined;
  let IDPSSODescriptor_: t.IDPSSO | undefined;
  let KeyDescriptor_: t.Key | undefined;
  let Organization_: t.Organization | undefined;
  let OrganizationName_: t.Localized | undefined;
  let OrganizationDisplayName_: t.Localized | undefined;
  let OrganizationURL_: t.Localized | undefined;
  let ContactPerson_: t.ContactPerson | undefined;
  let Company_: boolean = false;
  let GivenName_: boolean = false;
  let SurName_: boolean = false;
  let EmailAddress_: boolean = false;
  let TelephoneNumber_: boolean = false;
  let SingleSignOnService_: t.Endpoint | undefined;
  let SingleLogoutService_: t.Endpoint | undefined;
  let AssertionConsumerService_: t.IndexedEndpoint | undefined;
  let AttributeConsumingService_: t.AttributeConsumingService | undefined;
  let ServiceName_: t.Localized | undefined;
  let ServiceDescription_: t.Localized | undefined;
  let RequestedAttribute_: t.RequestedAttribute | undefined;
  let AttributeValue_: boolean = false;
  let KeyInfo_: boolean = false;
  let X509Data_: boolean = false;
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
        throw new t.ParseError(`The attribute "${name}" is required!`);
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
            if (stack.root() || stack.match(md, 'EntitiesDescriptor')) { 
              EntitiesDescriptorStack_.push(new t.EntitiesDescriptor({
                validUntil: opt('validUntil'),
                cacheDuration: opt('cacheDuration'),
                name: opt('Name'),
              }));
            }
            break;
          case 'EntityDescriptor':
            if (stack.root() || stack.match(md, 'EntitiesDescriptor')) { 
              EntityDescriptor_ = new t.EntityDescriptor({
                entityID: req('entityID'),
                validUntil: opt('validUntil'),
                cacheDuration: opt('cacheDuration'),
              });
            }
            break;
          case 'IDPSSODescriptor':
            if (EntityDescriptor_ &&
                stack.match(md, 'EntityDescriptor')) {
              IDPSSODescriptor_ = new t.IDPSSO({
                ...createSSO(),
                wantAuthnRequestsSigned: parseBoolean(opt('WantAuthnRequestsSigned')),
              });
            }
            break;
          case 'SPSSODescriptor':
            if (EntityDescriptor_ &&
                stack.match(md, 'EntityDescriptor')) {
              SPSSODescriptor_ = new t.SPSSO({
                ...createSSO(),
                authnRequestsSigned: parseBoolean(opt('AuthnRequestsSigned')),
                wantAssertionsSigned: parseBoolean(opt('WantAssertionsSigned')),
              });
            }
            break;
          case 'SingleLogoutService':
            if ((IDPSSODescriptor_ || SPSSODescriptor_) &&
                (stack.match(md, 'IDPSSODescriptor') || stack.match(md, 'SPSSODescriptor'))) {
              SingleLogoutService_ = new t.Endpoint(createEndpoint());
            }
            break;
          case 'SingleSignOnService':
            if (IDPSSODescriptor_ &&
                stack.match(md, 'IDPSSODescriptor')) {
              SingleSignOnService_ = new t.Endpoint(createEndpoint());
            }
            break;
          case 'AssertionConsumerService':
            if (SPSSODescriptor_  &&
                stack.match(md, 'SPSSODescriptor')) {
              AssertionConsumerService_ = new t.IndexedEndpoint({
                ...createEndpoint(),
                index: parseInteger(opt('index'))!,
                isDefault: parseBoolean(opt('isDefault')),
              });
            }
            break;
          case 'AttributeConsumingService':
            if (SPSSODescriptor_ &&
                stack.match(md, 'SPSSODescriptor')) {
              AttributeConsumingService_ = new t.AttributeConsumingService({
                index: parseInteger(opt('index'))!,
                isDefault: parseBoolean(opt('isDefault')),
              });
            }
            break;
          case 'ServiceName':
            if (AttributeConsumingService_ &&
                stack.match(md, 'AttributeConsumingService')) {
              ServiceName_ = new t.Localized(createLocalized());
            }
            break;
          case 'ServiceDescription':
            if (AttributeConsumingService_ &&
                stack.match(md, 'AttributeConsumingService')) {
              ServiceDescription_ = new t.Localized(createLocalized());
            }
            break;
          case 'RequestedAttribute':
            if (AttributeConsumingService_ && stack.match(md, 'AttributeConsumingService')) {
              RequestedAttribute_ = new t.RequestedAttribute({
                name: req('Name'),
                nameFormat: opt('NameFormat'),
                friendlyName: opt('FriendlyName'),
                isRequired: parseBoolean(opt('isRequired')),
              });
            }
            break;
          case 'KeyDescriptor':
            if ((IDPSSODescriptor_ || SPSSODescriptor_) &&
                (stack.match(md, 'IDPSSODescriptor') || stack.match(md, 'SPSSODescriptor'))) {
              KeyDescriptor_ = new t.Key({
                use: parseUse(opt('use')),
              });
            }
            break;
          case 'ContactPerson':
            if ((EntityDescriptor_ || IDPSSODescriptor_ || SPSSODescriptor_) &&
                (stack.match(md, 'EntityDescriptor') || stack.match(md, 'IDPSSODescriptor') || stack.match(md, 'SPSSODescriptor'))) {
              ContactPerson_ = new t.ContactPerson({
                contactType: parseContactType(req('contactType')),
              });
            }
            break;
          case 'Company':
            if (ContactPerson_ &&
                stack.match(md, 'ContactPerson')) {
              Company_ = true;
            }
            break;
          case 'GivenName':
            if (ContactPerson_ &&
                stack.match(md, 'ContactPerson')) {
              GivenName_ = true;
            }
            break;
          case 'SurName':
            if (ContactPerson_ &&
                stack.match(md, 'ContactPerson')) {
              SurName_ = true;
            }
            break;
          case 'EmailAddress':
            if (ContactPerson_ &&
                stack.match(md, 'ContactPerson')) {
              EmailAddress_ = true;
            }
            break;
          case 'TelephoneNumber':
            if (ContactPerson_ &&
                stack.match(md, 'ContactPerson')) {
              TelephoneNumber_ = true;
            }
            break;
          case 'Organization':
            if ((EntityDescriptor_ || IDPSSODescriptor_ || SPSSODescriptor_) &&
                (stack.match(md, 'EntityDescriptor') || stack.match(md, 'IDPSSODescriptor') || stack.match(md, 'SPSSODescriptor'))) {
              Organization_ = new t.Organization({
              });
            }
            break;
          case 'OrganizationName':
            if (Organization_ &&
                stack.match(md, 'Organization')) {
              OrganizationName_ = new t.Localized(createLocalized());
            }
            break;
          case 'OrganizationDisplayName':
            if (Organization_ &&
                stack.match(md, 'Organization')) {
              OrganizationDisplayName_ = new t.Localized(createLocalized());
            }
            break;
          case 'OrganizationURL':
            if (Organization_ &&
                stack.match(md, 'Organization')) {
              OrganizationURL_ = new t.Localized(createLocalized());
            }
            break;
        }
        break;
      case ds:
        switch (tag.local) {
          case 'KeyInfo':
            if (KeyDescriptor_
                && stack.match(md, 'KeyDescriptor')) {
              KeyInfo_ = true;
            }
            break;
          case 'X509Data':
            if (KeyInfo_
                && stack.match(ds, 'KeyInfo')) {
              X509Data_ = true;
            }
            break;
          case 'X509Certificate':
            if (X509Data_
                && stack.match(ds, 'X509Data')) {
              X509Certificate_ = true;
            }
            break;
        }
        break;
      case saml:
        switch (tag.local) {
          case 'AttributeValue':
            if (RequestedAttribute_
                && stack.match(md, 'Attribute')) {
              AttributeValue_ = true;
            }
            break;
        }
        break;
    }
    stack.push(ns, tag.local);
  });

  parser.on('text', (text: string) => {
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
          case 'KeyInfo':
            KeyInfo_ = false;
            break;
          case 'X509Data':
            X509Data_ = false;
            break;
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
    stack.pop(ns, tag.local);
    nss.pop();
  });
  const end: Promise<t.Metadata | undefined> = new Promise((resolve, reject) => {
    parser.on('end', () => resolve(metadata));
    parser.on('error', (e) => reject(e));
  });

  for await (const chunk of stream) {
    parser.write(chunk);
  }
  parser.close();

  return await end;
}
