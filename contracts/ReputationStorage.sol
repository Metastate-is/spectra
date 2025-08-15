// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReputationStorage {
    event MarkStored(
        address indexed sender,
        bytes32 fromParticipantId,
        bytes32 toParticipantId,
        bool value,
        bytes32 markType
    );

    event MarkUpdated(
        address indexed sender,
        bytes32 fromParticipantId,
        bytes32 toParticipantId,
        bool oldValue,
        bool newValue,
        bytes32 markType
    );

    struct Mark {
        bytes32 fromParticipantId;
        bytes32 toParticipantId;
        bool value;
        bytes32 markType;
    }

    Mark[] public marks;
    
    // Маппинг для быстрого поиска индекса марки
    mapping(bytes32 => mapping(bytes32 => mapping(bytes32 => uint256))) private markIndex;
    mapping(bytes32 => mapping(bytes32 => mapping(bytes32 => bool))) private markExists;
    mapping(bytes32 => uint256) private marksCountByType;

    function storeOrUpdateMark(
        bytes32 fromParticipantId,
        bytes32 toParticipantId,
        bool value,
        bytes32 markType
    ) external {
        if (markExists[fromParticipantId][toParticipantId][markType]) {
            // Обновляем существующую запись
            uint256 index = markIndex[fromParticipantId][toParticipantId][markType];
            bool oldValue = marks[index].value;
            marks[index].value = value;
            
            emit MarkUpdated(
                msg.sender,
                fromParticipantId,
                toParticipantId,
                oldValue,
                value,
                markType
            );
        } else {
            // Создаем новую запись
            marks.push(Mark(fromParticipantId, toParticipantId, value, markType));
            uint256 newIndex = marks.length - 1;
            markIndex[fromParticipantId][toParticipantId][markType] = newIndex;
            markExists[fromParticipantId][toParticipantId][markType] = true;
            marksCountByType[markType]++;
            
            emit MarkStored(
                msg.sender,
                fromParticipantId,
                toParticipantId,
                value,
                markType
            );
        }
    }

    function getMark(
        bytes32 fromParticipantId,
        bytes32 toParticipantId,
        bytes32 markType
    ) external view returns (Mark memory) {
        require(
            markExists[fromParticipantId][toParticipantId][markType],
            "Mark does not exist"
        );
        uint256 index = markIndex[fromParticipantId][toParticipantId][markType];
        return marks[index];
    }

    function getMarksCount() external view returns (uint256) {
        return marks.length;
    }

    function getMarksCountByType(bytes32 markType) external view returns (uint256) {
        return marksCountByType[markType];
    }
}