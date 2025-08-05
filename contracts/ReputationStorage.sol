// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReputationStorage {
  event MarkStored(
    address indexed sender,
    uint256 fromParticipantId,
    uint256 toParticipantId,
    bool value,
    string markType
  );

  struct Mark {
    uint256 fromParticipantId;
    uint256 toParticipantId;
    bool value;
    string markType;
  }

  Mark[] public marks;

  function storeMark(
    uint256 fromParticipantId,
    uint256 toParticipantId,
    bool value,
    string calldata markType
  ) external {
    marks.push(Mark(fromParticipantId, toParticipantId, value, markType));
    emit MarkStored(msg.sender, fromParticipantId, toParticipantId, value, markType);
  }

  function getMark(uint index) external view returns (Mark memory) {
    return marks[index];
  }

  function getMarksCount() external view returns (uint) {
    return marks.length;
  }
}
