import {ParseError} from './types.js';

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
      throw new ParseError('Stack empty'); 
    }
    if (!tag.equal(new Tag(ns_, local_))) {
      throw new ParseError(`Unexpected tag ${tag}`); 
    }
  }

  match(m: Matcher): boolean {
    return m.match(this.tags, (_) => true);
  }
}
