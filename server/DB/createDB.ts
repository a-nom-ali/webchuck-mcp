import {dbRun, dbAll, dbGet} from "./dbManager.js";

const dbCreateSQL = [
    "create table ChuckSnippets\n" +
    "(\n" +
    "    id          INTEGER\n" +
    "        primary key,\n" +
    "    name        TEXT                                not null\n" +
    "        unique,\n" +
    "    code        TEXT                                not null,\n" +
    "    description TEXT,\n" +
    "    created_at  TIMESTAMP default CURRENT_TIMESTAMP not null,\n" +
    "    updated_at  TIMESTAMP default CURRENT_TIMESTAMP not null\n" +
    ");\n",
    "create table SnippetTags\n" +
    "(\n" +
    "    id         INTEGER\n" +
    "        primary key,\n" +
    "    snippet_id INTEGER not null\n" +
    "        references ChuckSnippets,\n" +
    "    tag        TEXT    not null,\n" +
    "    unique (snippet_id, tag)\n" +
    ");\n",
    "create index idx_snippet_tags_snippet_id\n" +
    "    on SnippetTags (snippet_id);\n",
    "create table Volumes\n" +
    "(\n" +
    "    id            INTEGER\n" +
    "        primary key,\n" +
    "    name          TEXT                                not null\n" +
    "        unique,\n" +
    "    physical_path TEXT                                not null,\n" +
    "    type          TEXT      default 'filesystem'      not null,\n" +
    "    description   TEXT,\n" +
    "    is_active     INTEGER   default 1                 not null,\n" +
    "    created_at    TIMESTAMP default CURRENT_TIMESTAMP not null\n" +
    ");\n",
    "create table Samples\n" +
    "(\n" +
    "    id               INTEGER\n" +
    "        primary key,\n" +
    "    volume_id        INTEGER                             not null\n" +
    "        references Volumes,\n" +
    "    relative_path    TEXT                                not null,\n" +
    "    filename         TEXT                                not null,\n" +
    "    duration_seconds REAL,\n" +
    "    channels         INTEGER,\n" +
    "    sample_rate      INTEGER,\n" +
    "    file_size_bytes  INTEGER,\n" +
    "    format           TEXT,\n" +
    "    is_indexed       INTEGER   default 0,\n" +
    "    metadata         TEXT,\n" +
    "    created_at       TIMESTAMP default CURRENT_TIMESTAMP not null,\n" +
    "    last_accessed    TIMESTAMP,\n" +
    "    unique (volume_id, relative_path)\n" +
    ");\n",
    "create table SampleTags\n" +
    "(\n" +
    "    id        INTEGER\n" +
    "        primary key,\n" +
    "    sample_id INTEGER not null\n" +
    "        references Samples,\n" +
    "    tag       TEXT    not null,\n" +
    "    unique (sample_id, tag)\n" +
    ");\n" +
    "\n" +
    "create index idx_sample_tags_sample_id\n" +
    "    on SampleTags (sample_id);\n",
    "create index idx_samples_volume_id\n" +
    "    on Samples (volume_id);\n"
];

export const createDB = () => {
    for (const sql of dbCreateSQL) {
        dbRun(sql).catch(
            (err) => console.error(err)
        );
    }
}