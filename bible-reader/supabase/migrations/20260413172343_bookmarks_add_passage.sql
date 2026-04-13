alter table bookmarks add column reference text;
alter table bookmarks add column selected_text text;

-- Remove the unique constraint that prevents multiple passages from same chapter
alter table bookmarks drop constraint bookmarks_user_id_book_abbrev_chapter_num_key;

-- New unique constraint on user + reference (a specific passage)
alter table bookmarks add constraint bookmarks_user_id_reference_key unique (user_id, reference);
