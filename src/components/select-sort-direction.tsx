// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsSortDirection, FastCommentsState} from "../types/fastcomments-state";
import DropDownPicker from 'react-native-dropdown-picker';
import {useState} from "react";
import {State} from "@hookstate/core";

export function SelectSortDirection(state: State<FastCommentsState>) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    {label: state.translations.OLDEST_FIRST.get(), value: 'OF'},
    {label: state.translations.NEWEST_FIRST.get(), value: 'NF'},
    {label: state.translations.MOST_RELEVANT.get(), value: 'MR'},
  ]);

  const setValue = (newValue: any) => state.sortDirection.set(newValue as FastCommentsSortDirection);

  return (
    <DropDownPicker
      open={open}
      value={state.sortDirection.get()}
      items={items}
      setOpen={setOpen}
      setValue={setValue}
      setItems={setItems}
    />
  );
}
