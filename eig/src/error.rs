use std::fmt::{Debug, Display, Formatter};
use crate::{expression, parser, scanner};

#[derive(Debug)]
pub enum Error {
    ScanError(scanner::ScanError),
    ExpressionParseError(expression::ParseError),
    ParseError(parser::ParseError),
}

impl Display for Error {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        Debug::fmt(self, f)
    }
}

impl std::error::Error for Error {}
