use std::fmt::{Debug, Display, Formatter};

use crate::error::Error;
use crate::scanner;
use crate::scanner::Token::{Atom, Float, Ident, Integer, Paren, Percent, EOF};
use crate::scanner::{ScannedToken, Token};
use crate::expression::ErrorKind::{ConsumeFailed, MatchExhausted};

#[derive(Clone)]
pub enum Expression {
    List(Vec<Expression>),
    Ident(String),
    Atom(String),
    String(String),
    Integer(i64),
    Float(f32),
    Percent(f32),
}

impl Debug for Expression {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "'{self}'")
    }
}

impl Display for Expression {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Expression::List(terms) => {
                f.write_str("(")?;
                for (i, term) in terms.iter().enumerate() {
                    Display::fmt(term, f)?;
                    if i < terms.len() - 1 {
                        f.write_str(" ")?;
                    }
                }
                f.write_str(")")?;
                Ok(())
            }
            Expression::Ident(name) => write!(f, "{name}"),
            Expression::Atom(value) => write!(f, ":{value}"),
            Expression::String(value) => write!(f, "\"{value}\""),
            Expression::Percent(value) => write!(f, "{value}%"),
            Expression::Float(value) => write!(f, "{value}"),
            Expression::Integer(value) => write!(f, "{value}"),
        }
    }
}

#[derive(Debug, Clone)]
pub struct ParseError {
    kind: ErrorKind,
    token: ScannedToken,
}

#[derive(Debug, Clone)]
pub enum ErrorKind {
    MatchExhausted,
    ConsumeFailed { expected: &'static str },
}

pub fn parse(source: &str) -> Result<Expression, Error> {
    let tokens = scanner::scan(source)?;
    parse_tokens(tokens)
}

pub fn parse_tokens(tokens: Vec<ScannedToken>) -> Result<Expression, Error> {
    Parser::new(tokens).parse().map_err(Error::ExpressionParseError)
}

struct Parser {
    tokens: Vec<ScannedToken>,
    index: usize,
}

impl Parser {
    pub fn new(tokens: Vec<ScannedToken>) -> Self {
        Self { tokens, index: 0 }
    }

    pub fn parse(mut self) -> Result<Expression, ParseError> {
        self.expression().map_err(|kind| ParseError {
            kind,
            token: self.current_scanned().clone(),
        })
    }

    fn current_scanned(&self) -> &ScannedToken {
        &self.tokens[self.index]
    }

    fn current(&self) -> &Token {
        &self.current_scanned().tok
    }

    fn increment(&mut self) {
        self.index += 1;
    }

    fn expression(&mut self) -> Result<Expression, ErrorKind> {
        let token = self.current().clone();
        self.increment();
        match token {
            Paren('(') => self.list(),
            Ident(name) => Ok(Expression::Ident(name)),
            Float(value) => Ok(Expression::Float(value)),
            Integer(value) => Ok(Expression::Integer(value)),
            Percent(value) => Ok(Expression::Percent(value)),
            Atom(value) => Ok(Expression::Atom(value)),
            Token::String(value) => Ok(Expression::String(value)),
            _ => Err(MatchExhausted),
        }
    }

    fn list(&mut self) -> Result<Expression, ErrorKind> {
        let mut terms = Vec::new();
        while !matches!(self.current(), Paren(')') | EOF) {
            let term = self.expression()?;
            terms.push(term);
        }
        let Paren(')') = self.current() else {
            return Err(ConsumeFailed { expected: "right paren" });
        };
        self.increment();
        Ok(Expression::List(terms))
    }
}
