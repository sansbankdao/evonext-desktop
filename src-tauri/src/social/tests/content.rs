// src-tauri/src/social/tests/content.rs

//! Phase A parser tests — semantics pinned to Yappr's post-content.tsx
//! (via evonext-mobile src/helpers/postContent.ts).

use crate::social::content::parse_post_content;
use crate::social::{ContentPart, ContentPartType as T};

fn types(parts: &[ContentPart]) -> Vec<T> {
    parts.iter().map(|p| p.part_type).collect()
}

fn values(parts: &[ContentPart]) -> Vec<&str> {
    parts.iter().map(|p| p.value.as_str()).collect()
}

#[test]
fn empty_content_yields_no_parts() {
    assert!(parse_post_content("").is_empty());
}

#[test]
fn plain_text_passthrough() {
    let parts = parse_post_content("hello world");
    assert_eq!(types(&parts), vec![T::Text]);
    assert_eq!(values(&parts), vec!["hello world"]);
    assert_eq!(parts[0].children, None);
}

#[test]
fn bold_segment_with_text_children() {
    let parts = parse_post_content("Hello **world**!");
    assert_eq!(types(&parts), vec![T::Text, T::Bold, T::Text]);
    assert_eq!(parts[1].value, "world");
    // Formatting segments recurse into inline parsing.
    assert_eq!(types(parts[1].children.as_ref().unwrap()), vec![T::Text]);
}

#[test]
fn bold_beats_italic_on_overlap() {
    // "**b**" must yield Bold — never two nested/conflicting italics.
    let parts = parse_post_content("**b**");
    assert_eq!(types(&parts), vec![T::Bold]);
    assert_eq!(parts[0].value, "b");
}

#[test]
fn italic_segment() {
    let parts = parse_post_content("a *b* c");
    assert_eq!(types(&parts), vec![T::Text, T::Italic, T::Text]);
    assert_eq!(parts[1].value, "b");
}

#[test]
fn code_segment() {
    let parts = parse_post_content("run `cargo test` now");
    assert_eq!(types(&parts), vec![T::Text, T::Code, T::Text]);
    assert_eq!(parts[1].value, "cargo test");
}

#[test]
fn mention_with_dash_suffix() {
    let parts = parse_post_content("hi @alice.dash !");
    assert_eq!(types(&parts), vec![T::Text, T::Mention, T::Text]);
    assert_eq!(parts[1].value, "@alice.dash"); // inline parts keep full match
}

#[test]
fn hashtag_cashtag_url() {
    let parts = parse_post_content("#dash and $DASH at https://dash.org now");
    assert_eq!(
        types(&parts),
        vec![T::Hashtag, T::Text, T::Cashtag, T::Text, T::Url, T::Text]
    );
    assert_eq!(parts[0].value, "#dash");
    assert_eq!(parts[2].value, "$DASH");
    assert_eq!(parts[4].value, "https://dash.org");
}

#[test]
fn ipfs_and_www_urls() {
    let parts = parse_post_content("ipfs://QmXoy and www.example.com");
    assert_eq!(types(&parts), vec![T::Url, T::Text, T::Url]);
    assert_eq!(parts[0].value, "ipfs://QmXoy");
    assert_eq!(parts[2].value, "www.example.com");
}

#[test]
fn formatting_recurses_into_inline() {
    // Yappr: formatting segments parse their inner content for inline types.
    let parts = parse_post_content("**@alice**");
    assert_eq!(types(&parts), vec![T::Bold]);
    assert_eq!(parts[0].value, "@alice");
    assert_eq!(types(parts[0].children.as_ref().unwrap()), vec![T::Mention]);
}

#[test]
fn mixed_line_full_overlap_resolution() {
    let parts = parse_post_content("a **b** c *d* e `f` g");
    assert_eq!(
        types(&parts),
        vec![
            T::Text,
            T::Bold,
            T::Text,
            T::Italic,
            T::Text,
            T::Code,
            T::Text
        ]
    );
    assert_eq!(
        values(&parts),
        vec!["a ", "b", " c ", "d", " e ", "f", " g"]
    );
}
