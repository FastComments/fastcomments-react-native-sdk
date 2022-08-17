// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsSortDirection, FastCommentsState} from "../types/fastcomments-state";
import DropDownPicker from 'react-native-dropdown-picker';
import {useState} from "react";

export function SelectSortDirection(state: FastCommentsState) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    {label: state.translations.OLDEST_FIRST, value: 'OF'},
    {label: state.translations.NEWEST_FIRST, value: 'NF'},
    {label: state.translations.MOST_RELEVANT, value: 'MR'},
  ]);

  const setValue = (newValue: any) => state.sortDirection = newValue as FastCommentsSortDirection;

  return (
    <DropDownPicker
      open={open}
      value={state.sortDirection}
      items={items}
      setOpen={setOpen}
      setValue={setValue}
      setItems={setItems}
    />
  );
}
