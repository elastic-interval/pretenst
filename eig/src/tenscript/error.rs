use std::fmt::{Debug, Display, Formatter};

use crate::tenscript::{parser, scanner, expression};

#[derive(Debug)]
pub enum Error {
    ScanError(scanner::ScanError),
    SexpParseError(expression::ParseError),
    ParseError(parser::ParseError),
}

impl Display for Error {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        Debug::fmt(self, f)
    }
}

impl std::error::Error for Error {}
